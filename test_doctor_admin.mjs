import { storage } from './js/utils/storage.js';
import { scheduleEngine } from './js/engines/scheduleEngine.js';

console.log('🧪 Starting Doctor Admin & Human Life Dynamic Unit Tests...');

const docId = 'doc_akhilesh';
const doctor = storage.getDoctorById(docId);
if (!doctor) throw new Error('Doctor not found!');
console.log('✅ Found doctor:', doctor.name);

// Test 1: Setting Delay Broadcast
storage.setDoctorDelay(docId, 25, 'Complicated cardiac patient');
const updatedDocDelay = storage.getDoctorById(docId);
if (updatedDocDelay.runningDelayMinutes !== 25) throw new Error('Delay minutes mismatch');
console.log('✅ Test 1 Passed: Doctor running delay broadcast set to 25m');

// Test 2: Adding Vacation Leave
const testLeave = {
  id: 'test_leave_1',
  title: 'Annual Retreat',
  startDate: '2026-09-10',
  endDate: '2026-09-15',
  reason: 'Family Vacation',
  type: 'vacation'
};
storage.addDoctorLeave(docId, testLeave);
const onLeaveCheck = scheduleEngine.isDoctorOnLeave(docId, '2026-09-11');
if (!onLeaveCheck || onLeaveCheck.id !== 'test_leave_1') throw new Error('Leave check failed: ' + JSON.stringify(onLeaveCheck));
console.log('✅ Test 2 Passed: Vacation leave registered and recognized by ScheduleEngine');

// Test 3: Emergency Surgery Block & Auto-Shift Appointments
const todayStr = '2026-09-08';
const tomorrowStr = '2026-09-09';
// Create sample appointment during surgery time
const sampleApt = storage.saveAppointment({
  doctorId: docId,
  patientName: 'Test Surgery Conflict Patient',
  date: todayStr,
  time: '14:00',
  durationMinutes: 30,
  status: 'confirmed'
});

storage.setDoctorSurgery(docId, {
  id: 'surg_101',
  startTime: '13:30',
  endTime: '15:30',
  procedureName: 'Emergency Cardiac Catheterization',
  otRoom: 'OT-1',
  targetDate: todayStr,
  active: true
});

const shiftResult = scheduleEngine.shiftAppointmentsForSurgery(docId, todayStr, '13:30', '15:30', tomorrowStr);
console.log(`✅ Test 3 Passed: Surgery dispatched. Shifted ${shiftResult.shiftedCount} overlapping appointment(s) to ${tomorrowStr}`);

const shiftedApt = storage.getAppointments().find(a => a.id === sampleApt.id);
if (shiftedApt.date !== tomorrowStr) throw new Error('Appointment was not shifted to tomorrow');
console.log('✅ Test 3 Verified: Shifted appointment date is now:', shiftedApt.date);

// Test 4: Digital Prescription on Appointment
const sampleRx = 'Rx:\n1. Tab Clopidogrel 75mg OD\n2. Tab Atorvastatin 40mg HS\nRest for 3 days.';
storage.setAppointmentPrescription(sampleApt.id, sampleRx);
const aptWithRx = storage.getAppointments().find(a => a.id === sampleApt.id);
if (aptWithRx.doctorPrescription !== sampleRx) throw new Error('Prescription not saved');
console.log('✅ Test 4 Passed: Digital prescription successfully saved to appointment');

// Clean up
storage.clearDoctorSurgery(docId);
storage.setDoctorDelay(docId, 0);
storage.removeDoctorLeave(docId, 'test_leave_1');
storage.deleteAppointment(sampleApt.id);
console.log('🎉 ALL DOCTOR ADMIN & LIFE DYNAMIC TESTS PASSED 100%!');
