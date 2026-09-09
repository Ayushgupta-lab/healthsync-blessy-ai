// Test Suite: Blessy Patient Memory Bank, Entity Extraction & Cognitive Medical Reasoning (Like ChatGPT & Gemini)
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
import { blessyMemoryEngine } from './src/engines/blessyMemoryEngine.js';
import { blessyCognitiveBrain } from './src/engines/blessyCognitiveBrain.js';
import { storageService } from './src/services/storageService.js';

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
console.log("BLESSY AI COGNITIVE MODEL & PATIENT MEMORY BANK VERIFICATION SUITE");
console.log("================================================================================\n");

// Reset storage to a clean demo baseline
storageService.resetDemoData();
const testUser = 'usr_patient_test_alex';

// -----------------------------------------------------------------------------
// TEST 1: Dynamic Clinical Entity Extraction from Natural Conversation
// -----------------------------------------------------------------------------
console.log("👉 TEST 1: Dynamic Clinical Fact Extraction from Conversational Text");
const engine = new (blessyConversationEngine.constructor)();
engine.session.user = { id: testUser, fullName: 'Alex Morgan', role: 'patient' };

// Turn 1: Patient mentions chronic condition and city
engine.processMessage("Main Indore mein rehta hoon aur mujhe 5 saal se diabetes hai.");
let memory = blessyMemoryEngine.getPatientMemory(testUser);
assert(memory.chronicConditions.includes('Diabetes Mellitus'), "Extracted chronic condition: 'Diabetes Mellitus'");
assert(memory.profile.preferredCity === 'Indore', "Extracted preferred location: 'Indore'");

// Turn 2: Patient mentions drug allergy and blood group
engine.processMessage("I am also allergic to penicillin and my blood group is B+.");
memory = blessyMemoryEngine.getPatientMemory(testUser);
assert(memory.allergies.includes('Penicillin'), "Extracted drug allergy: 'Penicillin'");
assert(memory.profile.bloodGroup === 'B+', "Extracted blood group: 'B+'");

// Turn 3: Patient mentions chemical/soap sensitivity
engine.processMessage("Mujhe detergent aur harsh soap se allergy aur khujli hoti hai.");
memory = blessyMemoryEngine.getPatientMemory(testUser);
assert(memory.allergies.includes('Soap/Chemical Sensitivity'), "Extracted sensitivity: 'Soap/Chemical Sensitivity'");

// -----------------------------------------------------------------------------
// TEST 2: Memory Recall On-Demand (Like ChatGPT / Gemini Memory Recall)
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 2: Memory Recall On-Demand Across English, Hinglish & Devanagari");

// English memory recall
const memRecallEng = engine.processMessage("What do you remember about my health?");
assert(memRecallEng.type === 'memory_recall', "English: 'What do you remember about my health?' triggers memory_recall");
assert(memRecallEng.message.includes('Diabetes Mellitus'), "English: Recalls Diabetes Mellitus");
assert(memRecallEng.message.includes('Penicillin'), "English: Recalls Penicillin allergy");
assert(memRecallEng.message.includes('Indore'), "English: Recalls preferred city Indore");
assert(memRecallEng.message.includes('B+'), "English: Recalls Blood Group B+");

// Hinglish memory recall
const memRecallHin = engine.processMessage("Meri medical history aur allergies kya hain?");
assert(memRecallHin.type === 'memory_recall', "Hinglish: 'Meri medical history aur allergies kya hain?' triggers memory_recall");
assert(memRecallHin.message.includes('Diabetes Mellitus') && memRecallHin.message.includes('Indore'), "Hinglish: Recalls patient history in Hinglish");

// Devanagari memory recall
const memRecallDev = engine.processMessage("मेरे स्वास्थ्य के बारे में क्या जानते हो?");
assert(memRecallDev.type === 'memory_recall', "Devanagari: 'मेरे स्वास्थ्य के बारे में क्या जानते हो?' triggers memory_recall");
assert(/[\u0900-\u097F]/.test(memRecallDev.message), "Devanagari: Memory recall rendered in native Devanagari script");

// -----------------------------------------------------------------------------
// TEST 3: Cognitive Medical Reasoning (Why/How/Home Care Questions Like ChatGPT)
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 3: Cognitive Medical Knowledge & Reasoning (ChatGPT & Gemini Brain)");

// 3A: Headaches Mechanism & Care
const cogHeadache = engine.processMessage("Why do headaches happen and what can I do at home?");
assert(cogHeadache.type === 'cognitive_medical_answer', "Cognitive: Headaches query returns cognitive_medical_answer");
assert(cogHeadache.category === 'headache', "Cognitive: Correctly categorized under headache neurology");
assert(cogHeadache.message.includes('tension') || cogHeadache.message.includes('dehydration'), "Cognitive: Explains scientific mechanisms");
assert(cogHeadache.message.includes('Dr. Priya Sharma'), "Cognitive: Recommends specialist Neurologist Dr. Priya Sharma");
assert(cogHeadache.message.includes('These symptoms can have different causes'), "Cognitive: Includes medical safety disclaimer");

// 3B: Skin Allergy & Soap Reaction (Hinglish)
const cogSkin = engine.processMessage("Kya sabun se skin allergy ho sakti hai aur gharelu upay kya hain?");
assert(cogSkin.type === 'cognitive_medical_answer', "Cognitive (Hinglish): Skin allergy query returns cognitive_medical_answer");
assert(cogSkin.category === 'skin', "Cognitive (Hinglish): Categorized under skin/dermatology");
assert(cogSkin.message.includes('Dr. Ananya Roy'), "Cognitive (Hinglish): Recommends specialist Dermatologist Dr. Ananya Roy");
assert(cogSkin.message.includes('In symptoms ke alag-alag causes ho sakte hain'), "Cognitive (Hinglish): Includes safety disclaimer");

// 3C: Stomach Acidity & Diet (Hindi)
const cogStomach = engine.processMessage("पेट में एसिडिटी क्यों होती है और क्या खाना चाहिए?");
assert(cogStomach.type === 'cognitive_medical_answer', "Cognitive (Hindi): Acidity query returns cognitive_medical_answer");
assert(cogStomach.category === 'stomach', "Cognitive (Hindi): Categorized under stomach/gastro");
assert(cogStomach.message.includes('Dr. Marcus Vance'), "Cognitive (Hindi): Recommends specialist Dr. Marcus Vance");
assert(/[\u0900-\u097F]/.test(cogStomach.message), "Cognitive (Hindi): Rendered in Devanagari Hindi");

// -----------------------------------------------------------------------------
// TEST 4: Proactive Memory Incorporation in Doctor Recommendations
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 4: Proactive Memory Incorporation in Doctor Recommendations");
// Patient discusses knee pain: Blessy recommends Dr. Patel AND mentions recorded history
const turnKnee = engine.processMessage("Mere ghutne mein 3 din se dard hai");
assert(turnKnee.type === 'symptom_recommendation', "Knee Pain: Provides specialist recommendation");
assert(turnKnee.data.specialistName.includes('Dr. Rajesh Patel'), "Knee Pain: Recommends Orthopedic Dr. Rajesh Patel");
assert(turnKnee.message.includes('Diabetes Mellitus') || turnKnee.message.includes('history'), "Proactive Context: Injected patient's recorded chronic condition into clinical note");

// -----------------------------------------------------------------------------
// TEST 5: Single-Question Voice Pacing in Cognitive & Memory Responses
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 5: Voice-Friendly Single Question Pacing Verification");
function countQuestionMarks(text) {
  return (text.match(/\?/g) || []).length;
}

assert(countQuestionMarks(memRecallEng.message) === 1, "Memory Recall message contains exactly ONE question mark");
assert(countQuestionMarks(cogHeadache.message) === 1, "Cognitive Headache message contains exactly ONE question mark");
assert(countQuestionMarks(cogSkin.message) === 1, "Cognitive Skin message contains exactly ONE question mark");

console.log("\n================================================================================");
console.log(`AI MEMORY & COGNITIVE MODEL TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
console.log("================================================================================");
