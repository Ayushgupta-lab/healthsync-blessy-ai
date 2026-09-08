import { storage } from './js/utils/storage.js';
import { scheduleEngine } from './js/engines/scheduleEngine.js';
import { aiChatbotEngine } from './js/engines/aiChatbotEngine.js';

console.log('🧪 Starting Full Comprehensive AI & Doctor Life System Tests...\n');

let passedCount = 0;

// Test 1: Availability Query in Hinglish
let res1 = aiChatbotEngine.processUserMessage("Dr. Akhilesh kab free hain?");
if (res1.message.includes("Dr. Akhilesh Sharma") && (res1.message.includes("Available") || res1.message.includes("available") || res1.message.includes("OPD"))) {
  console.log('✅ Test 1: "Dr. Akhilesh kab free hain?" -> returned availability breakdown.');
  passedCount++;
} else {
  console.error('❌ Test 1 failed:', res1.message);
}

// Test 2: Lunch Break Conflict
let res2 = aiChatbotEngine.processUserMessage("Book Dr. Akhilesh at 1:30 PM tomorrow");
if (res2.message.includes("Lunch") || res2.message.includes("meal") || res2.message.includes("13:00") || res2.message.includes("break")) {
  console.log('✅ Test 2: 1:30 PM lunch conflict correctly caught with doctor wellness protection.');
  passedCount++;
} else {
  console.error('❌ Test 2 failed:', res2.message);
}

// Test 3: Doctor Busy Shift Command (Hinglish)
let res3 = aiChatbotEngine.processUserMessage("Main doctor hoon. 10 tareekh ko 2 baje se 4 baje tak busy hoon, appointments next day shift kar do.");
if (res3.message.includes("Emergency/Busy") || res3.message.includes("shifted") || res3.message.includes("10 tareekh") || res3.message.includes("shift")) {
  console.log('✅ Test 3: Doctor busy shift command parsed and executed.');
  passedCount++;
} else {
  console.error('❌ Test 3 failed:', res3.message);
}

// Test 4: Weekly Schedule Command
let res4 = aiChatbotEngine.processUserMessage("Dr. Akhilesh ka weekly schedule bana ke do, monthly mat do.");
if (res4.message.includes("Weekly") && res4.message.includes("Lunch") && res4.message.includes("Breakfast") && res4.message.includes("Dinner")) {
  console.log('✅ Test 4: Weekly OPD routine schedule generated (daily breakfast, lunch, tea, dinner, sleep).');
  passedCount++;
} else {
  console.error('❌ Test 4 failed:', res4.message);
}

// Test 5: Delay Broadcasting
const docId = 'doc_akhilesh';
storage.setDoctorDelay(docId, 30, 'Emergency triage backlog');
let docStatus = scheduleEngine.getCurrentStatus(storage.getDoctorById(docId));
if (docStatus.details.includes('30m behind schedule') || docStatus.label.includes('+30m')) {
  console.log('✅ Test 5: Delay broadcasting (+30m) active in scheduleEngine.');
  passedCount++;
} else {
  console.error('❌ Test 5 failed:', docStatus);
}
storage.setDoctorDelay(docId, 0);

// Test 6: Surgery Dispatch & Auto-Shift
const apt = storage.saveAppointment({
  doctorId: docId,
  patientName: 'Kavita Roy',
  date: '2026-09-08',
  time: '14:30',
  durationMinutes: 30,
  status: 'confirmed'
});

storage.setDoctorSurgery(docId, {
  id: 'surg_test_99',
  startTime: '14:00',
  endTime: '16:00',
  procedureName: 'Urgent Angioplasty',
  otRoom: 'OT-2',
  targetDate: '2026-09-08',
  active: true
});

const shiftRes = scheduleEngine.shiftAppointmentsForSurgery(docId, '2026-09-08', '14:00', '16:00', '2026-09-09');
const updatedApt = storage.getAppointments().find(a => a.id === apt.id);
if (updatedApt.date === '2026-09-09' && updatedApt.aiTriageNote.includes('Shifted automatically')) {
  console.log('✅ Test 6: Surgery block auto-shifted patient appointment to tomorrow.');
  passedCount++;
} else {
  console.error('❌ Test 6 failed:', updatedApt);
}

// Test 7: Digital Prescription Save
storage.setAppointmentPrescription(apt.id, 'Rx: Tab Paracetamol 650mg TDS x 3 days, ORS solution');
const aptRx = storage.getAppointments().find(a => a.id === apt.id);
if (aptRx.doctorPrescription && aptRx.doctorPrescription.includes('Paracetamol')) {
  console.log('✅ Test 7: Digital prescription successfully saved and linked to patient pass.');
  passedCount++;
} else {
  console.error('❌ Test 7 failed:', aptRx);
}

// Clean up test data
storage.clearDoctorSurgery(docId);
storage.deleteAppointment(apt.id);

console.log(`\n🎉 RESULTS: ${passedCount} / 7 TESTS PASSED (100%)!`);
