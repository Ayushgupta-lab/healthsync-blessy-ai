// Comprehensive Test Suite: Doctor Notification on Booking, Patient Persistence & Pure INR Pricing
import assert from 'assert';
import { db } from './server/db.js';
import { authController } from './server/authController.js';
import { storageService } from './src/services/storageService.js';
import { clinicalTools } from './src/services/clinicalTools.js';
import { formatTime12 } from './src/services/scheduleEngine.js';

console.log('🩺 RUNNING TEST SUITE: Doctor Notification, Patient Persistence & Pure INR Pricing\n');

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}\n`);
  }
}

// -------------------------------------------------------------
// Test 1: All doctor records & fees normalized to pure INR (No $)
// -------------------------------------------------------------
it('Doctor consultation fees are pure INR (₹...) without dollar ($) tags', () => {
  const doctors = db.getDoctors();
  assert(Array.isArray(doctors) && doctors.length > 0, 'Doctors list must not be empty');
  
  for (const doc of doctors) {
    assert(!doc.consultationFee.includes('$'), `Doctor ${doc.name} consultationFee contains dollar sign: ${doc.consultationFee}`);
    assert(doc.consultationFee.startsWith('₹'), `Doctor ${doc.name} consultationFee must start with ₹: ${doc.consultationFee}`);
    assert(typeof doc.feeAmount === 'number' && doc.feeAmount > 0, `Doctor ${doc.name} feeAmount must be a positive number: ${doc.feeAmount}`);
  }
});

// -------------------------------------------------------------
// Test 2: Patient and Doctor Accounts Setup
// -------------------------------------------------------------
const testPatientEmail = `ayush_patient_${Date.now()}@healthsync.io`;
const testDoctorEmail = `dr_anand_${Date.now()}@healthsync.io`;
let patientUser, patientSession;
let doctorUser, doctorSession, doctorRecord;

it('Register Patient Account (Ayush Gupta)', () => {
  const reg = authController.register({
    fullName: 'Ayush Gupta',
    email: testPatientEmail,
    phone: '+91 98765 11111',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    role: 'patient'
  });
  assert.strictEqual(reg.status, 201, `Failed to register patient: ${reg.error}`);
  patientUser = reg.data.user;
  patientSession = reg.data.token;
  assert(patientUser.id, 'Patient user ID generated');
});

it('Register Doctor Account (Dr. Anand Gupta)', () => {
  const reg = authController.register({
    fullName: 'Dr. Anand Gupta',
    email: testDoctorEmail,
    phone: '+91 98765 22222',
    password: 'Password@123',
    confirmPassword: 'Password@123',
    role: 'doctor'
  });
  assert.strictEqual(reg.status, 201, `Failed to register doctor: ${reg.error}`);
  doctorUser = reg.data.user;
  doctorSession = reg.data.token;
  assert(doctorUser.doctorId, 'Doctor profile generated with doctorId');

  doctorRecord = db.getDoctorById(doctorUser.doctorId);
  assert(doctorRecord, 'Doctor record found in db.doctors');
  assert.strictEqual(doctorRecord.consultationFee, '₹700', 'Doctor consultation fee defaults to pure INR ₹700');
});

// -------------------------------------------------------------
// Test 3: Patient books appointment with Dr. Anand Gupta
// -------------------------------------------------------------
let bookedApt = null;
it('Create appointment with Doctor, capturing patient, duration, and clinical symptoms', () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const newApt = db.createAppointment({
    patientId: patientUser.id,
    patientName: patientUser.fullName,
    patientPhone: patientUser.phone,
    patientAge: 26,
    doctorId: doctorRecord.id,
    doctorName: doctorRecord.name,
    doctorSpecialty: doctorRecord.specialty,
    room: doctorRecord.roomNumber,
    date: tomorrow,
    time: '11:00',
    durationMinutes: 30,
    symptoms: 'Throbbing migraine and visual aura for past 2 days',
    urgency: 'routine',
    fee: doctorRecord.consultationFee
  });

  assert(newApt.id, 'Appointment created with unique ID');
  assert.strictEqual(newApt.patientName, 'Ayush Gupta');
  assert.strictEqual(newApt.durationMinutes, 30);
  assert.strictEqual(newApt.symptoms, 'Throbbing migraine and visual aura for past 2 days');
  assert(!newApt.fee.includes('$'), 'Appointment fee has no dollar tag');
  bookedApt = newApt;
});

// -------------------------------------------------------------
// Test 4: Doctor receives Instant Notification
// -------------------------------------------------------------
it('Doctor receives targeted notification with patient name, slot, duration & clinical problem', () => {
  // Simulate apiRouter notification creation
  const docNotification = db.createNotification({
    userId: doctorUser.id,
    doctorId: doctorRecord.id,
    role: 'doctor',
    title: `New Patient Appointment 📅 (#${bookedApt.id})`,
    message: `${bookedApt.patientName} has booked an appointment for ${bookedApt.date} at ${bookedApt.time} (${bookedApt.durationMinutes} mins). Problem: ${bookedApt.symptoms}.`,
    type: 'appointment',
    link: '#doctor-console'
  });

  assert(docNotification.id, 'Doctor notification created');
  assert.strictEqual(docNotification.userId, doctorUser.id);
  assert.strictEqual(docNotification.doctorId, doctorRecord.id);
  assert(docNotification.message.includes('Ayush Gupta'), 'Notification contains patient name');
  assert(docNotification.message.includes('30 mins'), 'Notification contains duration');
  assert(docNotification.message.includes(bookedApt.symptoms), 'Notification contains symptoms/problem');

  // Verify doctor retrieves this notification
  const docNotifs = db.getNotifications(doctorUser.id, 'doctor', doctorRecord.id);
  assert(docNotifs.length > 0, 'Doctor can retrieve notification');
  const found = docNotifs.find(n => n.id === docNotification.id);
  assert(found, 'Notification retrieved in doctor notifications query');
});

// -------------------------------------------------------------
// Test 5: Patient Persistence (Appointments do NOT disappear!)
// -------------------------------------------------------------
it('Patient appointments persist in persistent database & storage sync without disappearing', () => {
  // 1. Check in DB
  const patientApts = db.getAppointments({ patientId: patientUser.id });
  assert(patientApts.length >= 1, 'Patient appointment found in DB');
  assert.strictEqual(patientApts[0].id, bookedApt.id);

  // 2. Sync to storageService
  const synced = storageService.syncAppointments(patientApts);
  const foundInStorage = synced.find(a => a.id === bookedApt.id);
  assert(foundInStorage, 'Appointment persisted in storageService and survives reloads');
  assert.strictEqual(foundInStorage.patientName, 'Ayush Gupta');
  assert.strictEqual(foundInStorage.status, 'confirmed');

  // 3. Verify it shows under upcoming
  const upcoming = synced.filter(a => a.status === 'confirmed' || a.status === 'shifted');
  assert(upcoming.some(a => a.id === bookedApt.id), 'Appointment appears under UPCOMING tab');
});

// -------------------------------------------------------------
// Test 6: Doctor Sequential Schedule Timeline
// -------------------------------------------------------------
it('Doctor can fetch live sequential schedule timeline ordered by time', () => {
  const tomorrow = bookedApt.date;
  
  // Book another appointment later in the day
  const laterApt = db.createAppointment({
    patientId: 'usr_patient_2',
    patientName: 'Rohan Verma',
    patientPhone: '+91 98765 33333',
    patientAge: 40,
    doctorId: doctorRecord.id,
    doctorName: doctorRecord.name,
    doctorSpecialty: doctorRecord.specialty,
    date: tomorrow,
    time: '14:30',
    durationMinutes: 30,
    symptoms: 'Routine diabetes checkup and HbA1c review',
    urgency: 'routine',
    fee: doctorRecord.consultationFee
  });

  const docApts = db.getAppointments({ doctorId: doctorRecord.id });
  assert(docApts.length >= 2, 'Doctor has both appointments');

  // Chronological sort for the doctor console timeline
  const timeline = [...docApts].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return timeA - timeB;
  });

  assert.strictEqual(timeline[0].time, '11:00', 'First chronological slot is 11:00 AM');
  assert.strictEqual(timeline[0].patientName, 'Ayush Gupta', 'First slot is Ayush Gupta');
  assert.strictEqual(timeline[1].time, '14:30', 'Second chronological slot is 14:30 PM');
  assert.strictEqual(timeline[1].patientName, 'Rohan Verma', 'Second slot is Rohan Verma');
});

// -------------------------------------------------------------
// Test 7: Status Updates (e.g. Move from Upcoming to Completed)
// -------------------------------------------------------------
it('Completing appointment updates state and reflects across patient & doctor consoles', () => {
  const updated = db.updateAppointment(bookedApt.id, { status: 'completed' }, doctorRecord.name);
  assert.strictEqual(updated.status, 'completed', 'Status updated to completed');

  // Sync to storage
  const synced = storageService.syncAppointments([updated]);
  const completedList = synced.filter(a => a.status === 'completed');
  assert(completedList.some(a => a.id === bookedApt.id), 'Appointment moves to COMPLETED archive');

  const upcomingList = synced.filter(a => a.status === 'confirmed' || a.status === 'shifted');
  assert(!upcomingList.some(a => a.id === bookedApt.id), 'Completed appointment no longer in UPCOMING');
});

console.log(`\n======================================================`);
console.log(`RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log(`======================================================\n`);

if (passed !== total) {
  process.exit(1);
}
