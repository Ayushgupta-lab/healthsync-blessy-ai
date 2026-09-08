// Comprehensive End-to-End Verification of Blessy Step 1 & Step 2 Conversational Flows
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
import { storageService } from './src/services/storageService.js';
import { clinicalTools } from './src/services/clinicalTools.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log("================================================================================");
console.log("BLESSY AI STEP 1 & STEP 2 FULL CONVERSATION STATE MACHINE & WORKFLOW VERIFICATION");
console.log("================================================================================\n");

// Reset storage to a clean demo baseline
storageService.resetDemoData();

// -----------------------------------------------------------------------------
// TEST 1: Step 1 - Personalized Greeting for Patient & Doctor
// -----------------------------------------------------------------------------
console.log("👉 TEST 1: Greeting Personalization (Step 1 Bug Fix)");
const patientGreeting = blessyConversationEngine.generateGreeting(true, { fullName: 'Ayush Gupta', role: 'patient' });
assert(patientGreeting.message.includes('Ayush'), "Greeting uses patient's actual name ('Ayush')");
assert(patientGreeting.actionChips.length === 3, "Greeting presents exactly 3 primary options");
assert(patientGreeting.actionChips.some(c => c.action === 'show_doctors'), "Option 1: Show available doctors is present");
assert(patientGreeting.actionChips.some(c => c.action === 'discuss_symptoms'), "Option 2: Discuss symptoms is present");
assert(patientGreeting.actionChips.some(c => c.action === 'book_appointment'), "Option 3: Book appointment is present");

const doctorGreeting = blessyConversationEngine.generateGreeting(false, { fullName: 'Dr. Akhilesh Sharma', role: 'doctor' });
assert(doctorGreeting.message.includes('Dr. Akhilesh'), "Greeting recognizes doctor role and uses Dr. title");

// -----------------------------------------------------------------------------
// TEST 2: Step 1 - No Silent Stops on Primary Options
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 2: No Silent Stops on Option Selection (Step 1 Bug Fix)");
// Option 1: Show doctors
const resShow = blessyConversationEngine.processMessage('show_doctors');
assert(resShow && resShow.type === 'doctor_list' && resShow.data.length >= 3, "Option 1 'show_doctors' returns active doctor cards without silence");

// Option 2: Discuss symptoms
const resSymptoms = blessyConversationEngine.processMessage('discuss_symptoms');
assert(resSymptoms && resSymptoms.type === 'discuss_symptoms_prompt', "Option 2 'discuss_symptoms' prompts user for symptoms without silence");

// Option 3: Book appointment
const resBook = blessyConversationEngine.processMessage('book_appointment');
assert(resBook && resBook.type === 'booking_intent', "Option 3 'book_appointment' shows booking portal guidelines without silence");

// -----------------------------------------------------------------------------
// TEST 3: Step 2 Requirement 1 - Multi-Turn Symptom Discussion & Specialist Match
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 3: Symptom Discussion Multi-Turn Flow & Specialist Recommender");
// User chooses symptom discussion
blessyConversationEngine.processMessage('discuss_symptoms');
// User describes symptom without duration
const turn1 = blessyConversationEngine.processMessage('Mujhe bohot tez sar dard ho raha hai');
assert(turn1.type === 'symptom_followup', "Blessy asks follow-up questions for duration and severity");
assert(blessyConversationEngine.session.state === 'AWAITING_SYMPTOM_DETAILS', "State transitions to AWAITING_SYMPTOM_DETAILS");

// User answers duration/severity
const turn2 = blessyConversationEngine.processMessage('2 din se halka dard hai');
assert(turn2.type === 'symptom_recommendation', "Blessy provides clinical guidance and recommended specialist");
assert(turn2.data.specialistName.includes('Dr. Priya'), "Accurately recommends Neurologist (Dr. Priya) for headache/migraine");
assert(turn2.message.includes('Cephalalgia') || turn2.message.includes('Migraine'), "Includes clinical advice for headache");

// -----------------------------------------------------------------------------
// TEST 4: Step 2 Requirement 2 - Show Available Doctors (Real DB query)
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 4: Query Real-Time Doctor Availability from Database");
const docQuery = blessyConversationEngine.processMessage('🩺 Show available doctors');
assert(docQuery.type === 'doctor_list', "Returns list of doctors");
assert(docQuery.data.every(d => d.name && d.specialty && d.consultationFee && d.roomNumber), "Each doctor has complete DB metadata (specialty, fee, room)");

// -----------------------------------------------------------------------------
// TEST 5: Step 2 Requirement 3 - Book Appointment Multi-Turn & DB Persistence
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 5: Book Appointment Multi-Turn with Slot Checking & DB Save");
// Set user context
blessyConversationEngine.setUserContext({ fullName: 'Ayush TestPatient', phone: '+91 99999 88888', role: 'patient' });

// 1. Pick doctor
const pickDoc = blessyConversationEngine.processMessage('select_doctor_doc_akhilesh');
assert(pickDoc.type === 'doctor_selected', "Selects Dr. Akhilesh and requests preferred time");

// 2. Request preferred slot
const pickSlot = blessyConversationEngine.processMessage('kal 10:00 am');
assert(pickSlot.type === 'negotiation_available', "Checks schedule engine and confirms 10:00 AM slot is available");
assert(blessyConversationEngine.session.state === 'AWAITING_CONFIRMATION', "State transitions to AWAITING_CONFIRMATION");

// 3. Confirm booking
const confirmBooking = blessyConversationEngine.processMessage('Haan book kar do');
assert(confirmBooking.type === 'booking_confirmed', "Confirms booking deterministically");
assert(confirmBooking.data && confirmBooking.data.id.startsWith('APT-'), "Generates real Booking ID");
assert(confirmBooking.data.patientName === 'Ayush TestPatient', "Saves authenticated patient name in appointment record");

// Verify appointment exists in database storage
const storedApts = storageService.getAppointments();
const found = storedApts.find(a => a.id === confirmBooking.data.id);
assert(found !== undefined, "Appointment successfully persisted in database store");

// -----------------------------------------------------------------------------
// TEST 6: Step 2 Requirement 4 - Patient <-> Doctor PA / Staff Coordination (Reschedule)
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 6: Patient-Side PA Automation (Rescheduling without Staff Call)");
const reschedReq = blessyConversationEngine.processMessage('I want to reschedule my appointment');
assert(reschedReq.type === 'reschedule_options', "Finds active appointment and presents bookable reschedule options");

// Execute reschedule
const reschedExec = blessyConversationEngine.processMessage(`reschedule_${found.id}_11:30`);
assert(reschedExec.type === 'reschedule_success', "Automatically executes reschedule in database via clinicalTools");
assert(reschedExec.data.time === '11:30', "New time (11:30) updated in database record");

// -----------------------------------------------------------------------------
// TEST 7: Step 2 Requirement 5 - Doctor-Side Conversational Availability
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 7: Doctor Conversational Availability Commands ('busy till 5 PM', 'on leave tomorrow')");
// Doctor says: "I'm busy till 5 PM today"
const busyCmd = blessyConversationEngine.processMessage("Main doctor hoon, I'm busy till 5 PM today");
assert(busyCmd.type === 'doctor_block_executed', "Blessy parses busy command and blocks calendar");
assert(busyCmd.data.success === true, "Calendar block applied in database");

// Doctor says: "I'm on leave tomorrow"
const leaveCmd = blessyConversationEngine.processMessage("Main doctor hoon, I'm on leave tomorrow");
assert(leaveCmd.type === 'doctor_leave_executed', "Blessy parses doctor leave and updates doctor record");

const updatedDoc = storageService.getDoctorById('doc_akhilesh');
assert(updatedDoc.status === 'on_leave', "Doctor status updated to 'on_leave' in database");
assert(updatedDoc.leaves.some(l => l.reason.includes('Leave')), "Leave registered in doctor's leaves array in database");

// -----------------------------------------------------------------------------
// TEST 8: Step 2 Requirement 6 - Emergency Triage & Immediate Interrupt
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 8: Emergency Detection & Triage Safety");
const erRes = blessyConversationEngine.processMessage("Mujhe severe chest pain ho raha hai and I cannot breathe");
assert(erRes.type === 'emergency', "Identifies acute emergency condition");
assert(erRes.isInterrupt === true, "Issues immediate interrupt to hold routine outpatient queue");
assert(erRes.message.includes('108') || erRes.message.includes('911'), "Provides urgent 108 / 911 Ambulance contact");

const storedEmergencies = storageService.getEmergencies();
assert(storedEmergencies.length > 0, "Emergency record persisted in database store for clinical alert");

// -----------------------------------------------------------------------------
// TEST 9: Step 2 Requirement 7 - Healthcare Scope Control
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 9: Scope Control (Polite Redirect for Unrelated Topics)");
const oos1 = blessyConversationEngine.processMessage("What is the weather in Paris today?");
assert(oos1.type === 'scope_redirect', "Redirects weather questions back to clinic scope");
assert(oos1.message.includes('Medical') || oos1.message.includes('Clinical'), "Politely reminds user of medical front-desk role");

const oos2 = blessyConversationEngine.processMessage("Can you tell me a funny joke?");
assert(oos2.type === 'scope_redirect', "Redirects entertainment/joke requests back to clinic scope");

console.log("\n================================================================================");
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");
