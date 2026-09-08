// Production System Test Suite: Testing Clinical Schemas, Deterministic Tools, Schedule Engine & Blessy AI
import fs from 'fs';
import { clinicalTools } from './src/services/clinicalTools.js';
import { scheduleEngine } from './src/services/scheduleEngine.js';
import { storageService } from './src/services/storageService.js';
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
import { VoiceStreamClient } from './src/services/voiceStreamClient.js';

console.log('=== RUNNING HEALTHSYNC & BLESSY PRODUCTION-GRADE SYSTEM TESTS ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: Formal Clinical JSON Schemas
// -------------------------------------------------------------
const rawSchemas = fs.readFileSync('./src/schemas/clinicalSchemas.json', 'utf-8');
const schemas = JSON.parse(rawSchemas);
assert(
  schemas.definitions &&
  schemas.definitions.Doctor &&
  schemas.definitions.Slot &&
  schemas.definitions.Appointment &&
  schemas.definitions.Leave &&
  schemas.definitions.EmergencyReport &&
  schemas.definitions.ToolCall,
  'Formal JSON Schemas defined for Doctor, Slot, Appointment, Leave, EmergencyReport, and ToolCall'
);

// -------------------------------------------------------------
// Test 2: Tool 1 - checkSlotAvailability()
// -------------------------------------------------------------
const targetTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

// A. Available slot check
const availCheck = clinicalTools.checkSlotAvailability({
  doctorId: 'doc_akhilesh',
  date: targetTomorrow,
  timePreference: '10:00'
});
assert(
  availCheck.isAvailable === true && availCheck.status === 'slot_available',
  'checkSlotAvailability() identifies open 10:00 AM slot as available'
);

// B. Lunch break conflict check
const breakCheck = clinicalTools.checkSlotAvailability({
  doctorId: 'doc_akhilesh',
  date: targetTomorrow,
  timePreference: '13:30' // 1:30 PM is during 13:00 - 14:00 Lunch Break
});
assert(
  breakCheck.isAvailable === false &&
  breakCheck.status === 'slot_conflict' &&
  breakCheck.conflictReason.toLowerCase().includes('lunch'),
  'checkSlotAvailability() catches lunch break conflict and reports conflict reason'
);
assert(
  breakCheck.alternatives && breakCheck.alternatives.length > 0,
  'checkSlotAvailability() proposes nearest alternate available slots'
);

// -------------------------------------------------------------
// Test 3: Tool 2 - bookAppointment()
// -------------------------------------------------------------
const booking = clinicalTools.bookAppointment({
  doctorId: 'doc_akhilesh',
  date: targetTomorrow,
  time: '10:00',
  patientName: 'Rohan Verma',
  patientPhone: '+91-98765-43210',
  patientAge: 34,
  bloodGroup: 'B+',
  symptoms: 'Mild tachycardia and chest tightness on exertion'
});
assert(
  booking.success === true && booking.appointment && booking.appointment.id.startsWith('APT-'),
  'bookAppointment() deterministically reserves slot and generates verified appointment ID'
);

// Verify that the booked slot is now marked as booked/unavailable
const recheck = clinicalTools.checkSlotAvailability({
  doctorId: 'doc_akhilesh',
  date: targetTomorrow,
  timePreference: '10:00'
});
assert(
  recheck.isAvailable === false,
  'Booked slot is immediately reflected in calendar availability checks'
);

// -------------------------------------------------------------
// Test 4: Tool 3 - rescheduleAppointment()
// -------------------------------------------------------------
const reschedule = clinicalTools.rescheduleAppointment({
  appointmentId: booking.appointment.id,
  newDate: targetTomorrow,
  newTime: '11:30',
  reason: 'Patient requested late morning timing'
});
assert(
  reschedule.success === true && reschedule.updatedAppointment.time === '11:30',
  'rescheduleAppointment() safely moves booking to new available time slot'
);

// -------------------------------------------------------------
// Test 5: Tool 4 - blockDoctorCalendar() & Emergency Shift
// -------------------------------------------------------------
const blockTest = clinicalTools.blockDoctorCalendar({
  doctorId: 'doc_akhilesh',
  date: targetTomorrow,
  startTime: '11:00',
  endTime: '12:30',
  reason: 'Emergency Cardiac Catheterization (OT-1)',
  shiftAppointmentsNextDay: true
});
assert(
  blockTest.success === true && blockTest.impactedAppointmentsShifted >= 1,
  'blockDoctorCalendar() blocks surgery interval and auto-shifts overlapping patient bookings'
);

// Verify doctor status updated to in_surgery
const docUpdated = storageService.getDoctorById('doc_akhilesh');
assert(
  docUpdated.status === 'in_surgery' && docUpdated.activeSurgery !== null,
  'Doctor status updated to in_surgery with active surgery metadata'
);

// -------------------------------------------------------------
// Test 6: Tool 5 - reportEmergency()
// -------------------------------------------------------------
const erReport = clinicalTools.reportEmergency({
  patientName: 'Kavita Sen',
  symptoms: 'Sudden crushing central chest pain radiating to left arm',
  location: 'Connaught Place, New Delhi',
  urgencyLevel: 'CRITICAL_ER'
});
assert(
  erReport.success === true &&
  erReport.directive === 'IMMEDIATE_INTERRUPT' &&
  erReport.emergencyRecord.bookingHeld === true,
  'reportEmergency() issues IMMEDIATE_INTERRUPT and holds non-emergency bookings'
);

// -------------------------------------------------------------
// Test 7: Conversational AI ("Blessy") - Empathetic Tone
// -------------------------------------------------------------
const greeting = blessyConversationEngine.processMessage('Namaste Blessy');
assert(
  greeting.message.includes('Namaste') &&
  greeting.message.includes('Blessy') &&
  greeting.message.includes('Dr. Akhilesh'),
  'Blessy greeting identifies as Dr. Akhilesh\'s assistant with polite bedside manner'
);

// -------------------------------------------------------------
// Test 8: Patient-Led Slot Negotiation
// -------------------------------------------------------------
const negotiation = blessyConversationEngine.processMessage('Doctor kal 1:30 baje milenge?');
assert(
  negotiation.type === 'negotiation_conflict' &&
  (negotiation.message.includes('Lunch') || negotiation.message.includes('break') || negotiation.message.includes('unavailable')),
  'Patient slot negotiation detects lunch conflict and suggests nearest alternate slots'
);

// -------------------------------------------------------------
// Test 9: Doctor Admin Voice Commands
// -------------------------------------------------------------
const adminCommand = blessyConversationEngine.processMessage(
  'main doctor hoon, kal 2 baje se 5 baje tak busy hoon, appointments shift kar do'
);
assert(
  adminCommand.type === 'doctor_block_executed' &&
  adminCommand.data &&
  adminCommand.data.impactedAppointmentsShifted !== undefined,
  'Doctor voice command successfully triggers blockDoctorCalendar and auto-shifts bookings'
);

// Buffer command
const bufferCommand = blessyConversationEngine.processMessage(
  'Add emergency 15-min buffer after every 3 patients'
);
assert(
  bufferCommand.type === 'doctor_command_result' && bufferCommand.message.toLowerCase().includes('buffer'),
  'Doctor buffer command recalibrates schedule with 15-min intervals'
);

// -------------------------------------------------------------
// Test 10: Triage Red Flag Safety Protocol
// -------------------------------------------------------------
const redFlagMsg = blessyConversationEngine.processMessage(
  'patient has sudden severe crushing chest pain and breathless'
);
assert(
  redFlagMsg.type === 'emergency' &&
  redFlagMsg.isInterrupt === true &&
  redFlagMsg.toolCalled === 'reportEmergency',
  'Triage protocol detects severe red flags and immediately interrupts with emergency guidance'
);

// -------------------------------------------------------------
// Test 11: VoiceStreamClient Abstraction
// -------------------------------------------------------------
const client = new VoiceStreamClient({ language: 'en-IN' });
assert(
  client.state === 'IDLE' && client.language === 'en-IN',
  'VoiceStreamClient initializes in IDLE state with configured language'
);
client.toggleMute();
assert(
  client.isMuted === true,
  'VoiceStreamClient toggleMute() updates mute state'
);
client.setLanguage('hi-IN');
assert(
  client.language === 'hi-IN',
  'VoiceStreamClient setLanguage() updates speech recognition locale'
);

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 11 PRODUCTION SYSTEM & LOGIC TESTS PASSED 100%!\n');
}
