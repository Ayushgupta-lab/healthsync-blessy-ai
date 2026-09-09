// Test Suite: Doctor Registration, Cross-Device Synchronization & Clinic Role Removal
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.js';
import { authController } from './server/authController.js';
import { storageService } from './src/services/storageService.js';
import { scheduleEngine } from './src/services/scheduleEngine.js';
import { clinicalTools } from './src/services/clinicalTools.js';
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
  }
}

console.log('='.repeat(80));
console.log('HEALTHSYNC & BLESSY: DOCTOR-PATIENT CONNECTIVITY & CLINIC ROLE REMOVAL TEST');
console.log('='.repeat(80));

// -------------------------------------------------------------
// TEST 1: Clinic Role Removal from SignIn and SignUp Forms
// -------------------------------------------------------------
console.log('\n👉 TEST 1: Verify Clinic PA Option Removed from Auth Forms');
const signInContent = fs.readFileSync(path.join(__dirname, 'src/components/auth/SignInForm.jsx'), 'utf8');
const signUpContent = fs.readFileSync(path.join(__dirname, 'src/components/auth/SignUpForm.jsx'), 'utf8');

assert(!signInContent.includes('📋 Clinic PA'), 'SignInForm does not contain "📋 Clinic PA" button');
assert(signInContent.includes('grid-cols-2'), 'SignInForm uses 2-column grid for Patient and Doctor only');
assert(!signUpContent.includes('📋 Clinic PA'), 'SignUpForm does not contain "📋 Clinic PA" option');
assert(signUpContent.includes('grid-cols-2'), 'SignUpForm uses 2-column grid for Patient and Doctor only');

// -------------------------------------------------------------
// TEST 2: Doctor Registration Creates Doctor in db.doctors
// -------------------------------------------------------------
console.log('\n👉 TEST 2: Doctor Registration Creates Verified Doctor in Database');
const testDocEmail = `dr.friend_${Date.now()}@healthsync.io`;
const testDocPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;

const regResult = authController.register({
  fullName: "Dr. Rahul Verma",
  email: testDocEmail,
  phone: testDocPhone,
  password: "DoctorSecure@123",
  confirmPassword: "DoctorSecure@123",
  role: "doctor"
});

assert(regResult.status === 201, `Doctor registration succeeded with status 201 (Got ${regResult.status})`);
assert(regResult.data && regResult.data.user, 'Registration returned user data object');
const newDoctorUser = regResult.data.user;
assert(newDoctorUser.role === 'doctor', 'New user has role "doctor"');
assert(!!newDoctorUser.doctorId, `Doctor user was assigned doctorId: '${newDoctorUser.doctorId}'`);

const docRecord = db.getDoctorById(newDoctorUser.doctorId);
assert(!!docRecord, `Doctor record exists in db.data.doctors for '${newDoctorUser.doctorId}'`);
assert(docRecord && docRecord.name === 'Dr. Rahul Verma', 'Doctor name in db.doctors matches full name');
assert(docRecord && docRecord.specialty === 'General Medicine & Clinical Care', 'Doctor has default specialty');
assert(docRecord && docRecord.routine && Array.isArray(docRecord.routine.breaks), 'Doctor has OPD routine with breaks');

// -------------------------------------------------------------
// TEST 3: Doctor Profile Updates Synchronize with db.doctors
// -------------------------------------------------------------
console.log('\n👉 TEST 3: Doctor Profile Onboarding Updates Sync to db.doctors');
const updateResult = authController.updateProfile(newDoctorUser.id, {
  name: "Dr. Rahul Verma, MD",
  specialty: "Pediatrics & Child Care",
  consultationFee: "₹850",
  feeAmount: 850,
  roomNumber: "Suite 204 - Pediatric OPD",
  hospital: "HealthSync Superspecialty Hospital Indore",
  city: "Indore"
});

assert(updateResult.status === 200, 'Profile update succeeded with status 200');
const updatedDocRecord = db.getDoctorById(newDoctorUser.doctorId);
assert(updatedDocRecord.specialty === 'Pediatrics & Child Care', 'Specialty synced to db.doctors: Pediatrics & Child Care');
assert(updatedDocRecord.consultationFee === '₹850', 'Consultation fee synced to db.doctors: ₹850');
assert(updatedDocRecord.roomNumber === 'Suite 204 - Pediatric OPD', 'Room number synced to db.doctors');
assert(updatedDocRecord.city === 'Indore', 'City synced to db.doctors: Indore');

// -------------------------------------------------------------
// TEST 4: Frontend storageService Syncs Remote Doctors
// -------------------------------------------------------------
console.log('\n👉 TEST 4: Frontend storageService Synchronizes Remote Doctors');
const allServerDocs = db.getDoctors();
assert(allServerDocs.some(d => d.id === newDoctorUser.doctorId), 'Server db.getDoctors() includes newly registered doctor');

const syncedDocs = storageService.syncDoctors(allServerDocs);
assert(syncedDocs.some(d => d.id === newDoctorUser.doctorId), 'storageService.syncDoctors merged newly registered doctor');

const storedDoc = storageService.getDoctorById(newDoctorUser.doctorId);
assert(storedDoc && storedDoc.name === 'Dr. Rahul Verma, MD', 'storageService.getDoctorById retrieves new doctor');
assert(storedDoc && storedDoc.specialty === 'Pediatrics & Child Care', 'storageService doctor has updated specialty');

// -------------------------------------------------------------
// TEST 5: Schedule Engine Slot Availability for New Doctor
// -------------------------------------------------------------
console.log('\n👉 TEST 5: Schedule Engine Generates Slots for New Doctor');
const nextSlot = scheduleEngine.getNextAvailableSlot(newDoctorUser.doctorId);
assert(!!nextSlot, `scheduleEngine generated next available slot for new doctor: ${nextSlot?.slot?.timeFormatted || 'N/A'}`);

const slotAvail = clinicalTools.checkSlotAvailability({
  doctorId: newDoctorUser.doctorId,
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  timePreference: '10:00',
  durationMinutes: 30
});
assert(slotAvail.success === true, '10:00 AM slot is available for booking with new doctor');

// -------------------------------------------------------------
// TEST 6: Blessy AI Recommends and Interacts with New Doctor
// -------------------------------------------------------------
console.log('\n👉 TEST 6: Blessy AI Recommends and Identifies New Doctor');
const doctorListResponse = blessyConversationEngine.processMessage('Available doctors ki list dikhao');
assert(doctorListResponse.message.includes('Dr. Rahul Verma'), 'Blessy doctor list includes newly registered Dr. Rahul Verma');

// -------------------------------------------------------------
// TEST 7: Self-Healing Migration for Existing Doctor Accounts
// -------------------------------------------------------------
console.log('\n👉 TEST 7: Self-Healing Migration Ensures Existing Accounts Have Doctor Records');
// Create an orphan doctor user without doctor record
const orphanEmail = `dr.orphan_${Date.now()}@test.io`;
const orphanUser = db.createUser({
  fullName: "Dr. Sandeep Deshmukh",
  email: orphanEmail,
  phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
  role: "doctor",
  salt: "salt123",
  passwordHash: "hash123",
  isOnboarded: false
});

// Run ensureDoctorRecords to simulate system restart / migration
db.ensureDoctorRecords();
const healedDoc = db.getDoctorByUserId(orphanUser.id);
assert(!!healedDoc, 'ensureDoctorRecords self-healed orphan doctor account into active doctor');
assert(healedDoc && healedDoc.name === 'Dr. Sandeep Deshmukh', 'Self-healed doctor has correct name');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n' + '='.repeat(80));
console.log(`DOCTOR-PATIENT CONNECTIVITY TEST SUMMARY: ${passed} / ${passed + failed} TESTS PASSED`);
console.log('='.repeat(80));

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
