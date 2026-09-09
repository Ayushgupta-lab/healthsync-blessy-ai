// Test Suite: Blessy Natural Intent, Voice-Friendly Pacing & Specialty Hospital Verification
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
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
console.log("BLESSY CONVERSATIONAL ENGINE: 12 CORE PRINCIPLES VERIFICATION SUITE");
console.log("================================================================================\n");

// Reset storage to a clean demo baseline
storageService.resetDemoData();

// -----------------------------------------------------------------------------
// PRINCIPLE 1: Natural Intent Understanding for Symptom Requests (No Menu-Reading)
// -----------------------------------------------------------------------------
console.log("👉 PRINCIPLE 1: Natural Intent Understanding - English Symptom Variations");
const englishSymptomPhrases = [
  "I want to discuss my symptoms.",
  "I have some symptoms.",
  "I want to tell you what's wrong.",
  "I'm not feeling well.",
  "I have a health problem.",
  "Can I tell you my problem?",
  "I want to talk about my health issue.",
  "Something is wrong with my health.",
  "Can you help me understand what these symptoms mean?",
  "I've been having some issues lately."
];

for (const phrase of englishSymptomPhrases) {
  const engine = new (blessyConversationEngine.constructor)();
  const res = engine.processMessage(phrase);
  assert(
    res && (res.type === 'discuss_symptoms_prompt' || res.type === 'symptom_followup' || res.type === 'symptom_recommendation'),
    `English: "${phrase}" correctly understood as symptom intent (type: ${res.type})`
  );
  assert(
    !res.message.includes("Please say Discuss Symptoms") && !res.message.includes("Option 1"),
    `English: "${phrase}" never reads website buttons`
  );
}

console.log("\n👉 PRINCIPLE 1: Natural Intent Understanding - Hindi/Hinglish Symptom Variations");
const hindiSymptomPhrases = [
  "Mujhe apne symptoms discuss karne hain.",
  "Meri tabiyat theek nahi hai.",
  "Mujhe kuch health problem hai.",
  "Mujhe apni problem batani hai.",
  "Kya main apni takleef bata sakta hoon?",
  "Meri tabiyat kharab lag rahi hai.",
  "Ye symptoms kya indicate karte hain?",
  "Mujhe samajh nahi aa raha mujhe kya hua hai.",
  "Main apni bimari ke bare mein baat karna chahta hoon."
];

for (const phrase of hindiSymptomPhrases) {
  const engine = new (blessyConversationEngine.constructor)();
  const res = engine.processMessage(phrase);
  assert(
    res && (res.type === 'discuss_symptoms_prompt' || res.type === 'symptom_followup' || res.type === 'symptom_recommendation'),
    `Hinglish: "${phrase}" correctly understood as symptom intent (type: ${res.type})`
  );
  assert(
    !res.message.includes("Please say Discuss Symptoms") && !res.message.includes("1. Discuss Symptoms"),
    `Hinglish: "${phrase}" never reads website buttons`
  );
}

console.log("\n👉 PRINCIPLE 1: Natural Intent Understanding - Native Devanagari Hindi");
const devanagariPhrases = [
  "मुझे अपने लक्षण बताने हैं।",
  "मेरी तबीयत ठीक नहीं है।"
];

for (const phrase of devanagariPhrases) {
  const engine = new (blessyConversationEngine.constructor)();
  const res = engine.processMessage(phrase);
  assert(
    res && (res.type === 'discuss_symptoms_prompt' || res.type === 'symptom_followup'),
    `Devanagari: "${phrase}" correctly understood as symptom intent`
  );
  assert(
    /[\u0900-\u097F]/.test(res.message),
    `Devanagari: "${phrase}" responds in native Devanagari Hindi script`
  );
}

// -----------------------------------------------------------------------------
// PRINCIPLE 2 & 3: 2-Step Doctor Suggestion Workflow (Pacing & Context Memory)
// -----------------------------------------------------------------------------
console.log("\n👉 PRINCIPLE 2 & 3: 2-Step Doctor Suggestion Process (No Immediate Doctor Dumping)");
const stepEngine = new (blessyConversationEngine.constructor)();

// Turn 1: User asks for a doctor recommendation in Hinglish
const step1 = stepEngine.processMessage("Mujhe doctor chahiye");
assert(step1.type === 'doctor_suggestion_prompt', "Step 1: 'Mujhe doctor chahiye' prompts for user's problem instead of dumping 5 doctors");
assert(step1.message.includes("Aapko kis takleef") || step1.message.includes("kis problem"), "Step 1: Asks what problem or symptoms user has");
assert(stepEngine.session.state === 'AWAITING_PROBLEM_FOR_DOCTOR', "Step 1: State transitions to AWAITING_PROBLEM_FOR_DOCTOR");

// Turn 2: User specifies symptom ("Skin allergy")
const step2 = stepEngine.processMessage("Mujhe skin pe allergy ho rahi hai");
assert(step2.type === 'symptom_followup', "Step 2: Acknowledges skin problem and asks duration");
assert(step2.message.includes("kab se") || step2.message.includes("कब से"), "Step 2: Paces conversation by asking duration question");
assert(stepEngine.session.symptoms.category === 'skin', "Step 2: Correctly categorized symptoms as 'skin'");

// Turn 3: User answers duration ("Teen din se")
const step3 = stepEngine.processMessage("Teen din se");
assert(step3.type === 'symptom_recommendation', "Step 3: Concludes clinical assessment with specialist recommendation");
assert(step3.data.specialistName.includes("Dr. Ananya Roy"), "Step 3: Recommends Dermatologist Dr. Ananya Roy, MD");
assert(step3.message.includes("In symptoms ke alag-alag causes ho sakte hain") || step3.message.includes("proper jaanch"), "Step 3: Contains medical safety disclaimer");
assert(step3.message.includes("Dr. Ananya Roy ke saath") && step3.message.includes("appointment slot"), "Step 3: Asks ONE clear closing question to book appointment");

// -----------------------------------------------------------------------------
// PRINCIPLE 2: Direct Specialty Doctor Search ("Skin ke liye kaunsa doctor?")
// -----------------------------------------------------------------------------
console.log("\n👉 PRINCIPLE 2: Direct Specialty Doctor Matching");
const directEngine = new (blessyConversationEngine.constructor)();
const directDoc = directEngine.processMessage("Skin ke liye kaunsa doctor hai?");
assert(directDoc.type === 'specialty_doctor_recommendation', "Direct: Matches specialty query directly");
assert(directDoc.data.name.includes("Dr. Ananya Roy"), "Direct: Recommends Dr. Ananya Roy, MD for skin");
assert(directDoc.message.includes("In symptoms ke alag-alag causes ho sakte hain"), "Direct: Includes safety disclaimer");
assert(directDoc.message.includes("Dr. Ananya Roy ke saath appointment slot check karoon?"), "Direct: Asks single appointment booking question");

// -----------------------------------------------------------------------------
// PRINCIPLE 9: Indore & Location-Based Hospital Recommendations
// -----------------------------------------------------------------------------
console.log("\n👉 PRINCIPLE 9: Indore & Hospital Recommendations");
const hospEngine = new (blessyConversationEngine.constructor)();
const hospRes = hospEngine.processMessage("Indore mein skin ke liye hospital chahiye");
assert(hospRes.type === 'hospital_recommendation' || hospRes.type === 'hospital_specialty_recommendation', "Indore: Understood hospital and specialty location query");
assert(hospRes.message.includes("Indore") && hospRes.message.includes("HealthSync"), "Indore: Confirms HealthSync hospital facility in Indore");
assert(hospRes.message.includes("Dr. Ananya Roy"), "Indore: Connects skin department to specialist Dr. Ananya Roy");
assert(hospRes.message.includes("In symptoms ke alag-alag causes ho sakte hain"), "Indore: Contains safety disclaimer");

// -----------------------------------------------------------------------------
// PRINCIPLE 8: Acute Emergency Interrupt
// -----------------------------------------------------------------------------
console.log("\n👉 PRINCIPLE 8: Acute Emergency Interrupt");
const emergEngine = new (blessyConversationEngine.constructor)();
const emergRes = emergEngine.processMessage("Mujhe seene mein bohot tez dard ho raha hai");
assert(emergRes.type === 'emergency' || emergRes.type === 'emergency_alert', "Emergency: Acute chest pain triggers emergency alert");
assert(emergRes.message.includes("108") || emergRes.message.includes("911"), "Emergency: Provides urgent ambulance emergency numbers");
assert(emergRes.message.includes("EMERGENCY") || emergRes.message.includes("आपातकालीन"), "Emergency: Highlights urgent clinical priority");

// -----------------------------------------------------------------------------
// PRINCIPLE 5: Single-Question Voice Pacing & Zero Menu Reading
// -----------------------------------------------------------------------------
console.log("\n👉 PRINCIPLE 5: Single Question Pacing Verification");
function countQuestionMarks(text) {
  return (text.match(/\?/g) || []).length;
}

assert(countQuestionMarks(step1.message) === 1, "Turn 1 message contains exactly ONE question mark");
assert(countQuestionMarks(step2.message) === 1, "Turn 2 message contains exactly ONE question mark");
assert(countQuestionMarks(step3.message) === 1, "Turn 3 message contains exactly ONE question mark");
assert(countQuestionMarks(directDoc.message) === 1, "Direct specialty message contains exactly ONE question mark");

console.log("\n================================================================================");
console.log(`NATURAL VOICE INTENT TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round(passedTests/totalTests*100)}%)`);
console.log("================================================================================");
