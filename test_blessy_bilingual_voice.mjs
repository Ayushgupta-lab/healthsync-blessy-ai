// Comprehensive Verification of Step 3: Bilingual Detection, Mid-Conversation Language Switching, and Voice Capabilities
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';
import { voiceStreamClient } from './src/services/voiceStreamClient.js';
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
console.log("BLESSY STEP 3: BILINGUAL SUPPORT & VOICE CLIENT VERIFICATION SUITE");
console.log("================================================================================\n");

// Reset storage to a clean demo baseline
storageService.resetDemoData();

// -----------------------------------------------------------------------------
// TEST 1: Language Detection (Devanagari, Romanized Hindi/Hinglish, and Pure English)
// -----------------------------------------------------------------------------
console.log("👉 TEST 1: Language Detection Accuracy");
// English queries
assert(blessyConversationEngine.detectLanguage("Hello, can you show available doctors?") === 'english', "English: 'Hello, can you show available doctors?' detected as English");
assert(blessyConversationEngine.detectLanguage("I have a severe throbbing headache") === 'english', "English: 'I have a severe throbbing headache' detected as English");
assert(blessyConversationEngine.detectLanguage("Book an appointment for tomorrow at 10 AM") === 'english', "English: 'Book an appointment for tomorrow at 10 AM' detected as English");
assert(blessyConversationEngine.detectLanguage("What is your consultation fee?") === 'english', "English: 'What is your consultation fee?' detected as English");

// Romanized Hindi / Hinglish queries
assert(blessyConversationEngine.detectLanguage("Mujhe bukhar aur khansi hai") === 'hinglish', "Hindi/Hinglish: 'Mujhe bukhar aur khansi hai' detected as Hindi/Hinglish");
assert(blessyConversationEngine.detectLanguage("Kal 10 baje ka slot mil sakta hai kya?") === 'hinglish', "Hindi/Hinglish: 'Kal 10 baje ka slot mil sakta hai kya?' detected as Hindi/Hinglish");
assert(blessyConversationEngine.detectLanguage("Haan book kar do") === 'hinglish', "Hindi/Hinglish: 'Haan book kar do' detected as Hindi/Hinglish");
assert(blessyConversationEngine.detectLanguage("Meri appointment kab hai?") === 'hinglish', "Hindi/Hinglish: 'Meri appointment kab hai?' detected as Hindi/Hinglish");
assert(blessyConversationEngine.detectLanguage("Main doctor hoon, kal meri chhutti hai") === 'hinglish', "Hindi/Hinglish: 'Main doctor hoon, kal meri chhutti hai' detected as Hindi/Hinglish");

// Native Devanagari Script queries
assert(blessyConversationEngine.detectLanguage("नमस्ते, मुझे डॉक्टर से मिलना है") === 'hinglish', "Devanagari: 'नमस्ते, मुझे डॉक्टर से मिलना है' detected as Hindi");
assert(blessyConversationEngine.detectLanguage("डॉक्टर की लिस्ट दिखाओ") === 'hinglish', "Devanagari: 'डॉक्टर की लिस्ट दिखाओ' detected as Hindi");
assert(blessyConversationEngine.detectLanguage("हाँ बुक कर दो") === 'hinglish', "Devanagari: 'हाँ बुक कर दो' detected as Hindi");

// -----------------------------------------------------------------------------
// TEST 2: Mid-Conversation Dynamic Language Switching
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 2: Mid-Conversation Dynamic Language Switching");
// Turn 1: User speaks in English
const turn1 = blessyConversationEngine.processMessage("Show available doctors");
assert(turn1.detectedLanguage === 'english', "Turn 1 (English): Returns detectedLanguage === 'english'");
assert(turn1.message.includes("Available Specialist Doctors"), "Turn 1 (English): Blessy replies in English");

// Turn 2: User switches mid-conversation to Hindi
const turn2 = blessyConversationEngine.processMessage("Mujhe Dr. Priya Sharma ke saath kal 10:00 AM ka appointment chahiye");
assert(turn2.detectedLanguage === 'hindi', "Turn 2 (Hindi): Blessy immediately switches to detectedLanguage === 'hindi'");
assert(turn2.message.includes("Dr. Priya Sharma") && (turn2.message.includes("available hai") || turn2.message.includes("select ho gaye")), "Turn 2 (Hindi): Blessy replies in Hindi/Hinglish");

// Turn 3: User switches back to English
const turn3 = blessyConversationEngine.processMessage("Yes please confirm my booking now");
assert(turn3.detectedLanguage === 'english', "Turn 3 (English): Blessy immediately switches back to detectedLanguage === 'english'");
assert(turn3.message.includes("Appointment Confirmed!"), "Turn 3 (English): Blessy replies in English");

// Turn 4: User queries in Hindi
const turn4 = blessyConversationEngine.processMessage("Meri appointment kab hai?");
assert(turn4.detectedLanguage === 'hindi', "Turn 4 (Hindi): Blessy switches to Hindi for appointment lookup");
assert(turn4.message.includes("Aapki next appointment") || turn4.message.includes("confirmed hai"), "Turn 4 (Hindi): Blessy answers lookup in Hindi");

// Turn 5: User asks off-scope question in English
const turn5 = blessyConversationEngine.processMessage("What is the weather in Paris today?");
assert(turn5.detectedLanguage === 'english', "Turn 5 (English Scope): Blessy detects English for scope redirection");
assert(turn5.message.includes("dedicated Medical Front-Desk Assistant"), "Turn 5 (English Scope): Polite scope redirect in English");

// Turn 6: User asks off-scope question in Hindi
const turn6 = blessyConversationEngine.processMessage("Kya aapko cricket pasand hai?");
assert(turn6.detectedLanguage === 'hindi', "Turn 6 (Hindi Scope): Blessy detects Hindi for scope redirection");
assert(turn6.message.includes("Medical & Clinical Assistant hoon"), "Turn 6 (Hindi Scope): Polite scope redirect in Hindi");

// -----------------------------------------------------------------------------
// TEST 3: All Handlers Provide Full English and Hindi Responses
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 3: Bilingual Response Integrity Across Handlers");
// Greeting
const greetEng = blessyConversationEngine.generateGreeting(false, { fullName: "Ayush", role: "patient" });
const greetHin = blessyConversationEngine.generateGreeting(true, { fullName: "Ayush", role: "patient" });
assert(greetEng.detectedLanguage === 'english' && greetEng.message.includes("Hello Ayush"), "Greeting (English): Hello Ayush");
assert(greetHin.detectedLanguage === 'hindi' && greetHin.message.includes("Namaste Ayush"), "Greeting (Hindi): Namaste Ayush");

// Symptoms Prompt
const symEng = blessyConversationEngine.routeMessage("discuss symptoms", false);
const symHin = blessyConversationEngine.routeMessage("lakshan discuss karein", true);
assert(symEng.message.includes("Please describe what symptoms"), "Symptoms Prompt (English): 'Please describe what symptoms'");
assert(symHin.message.includes("Aapko kya takleef"), "Symptoms Prompt (Hindi): 'Aapko kya takleef'");

// Reschedule
const reschedEng = blessyConversationEngine.routeMessage("reschedule", false);
const reschedHin = blessyConversationEngine.routeMessage("reschedule kar do", true);
assert(reschedEng.message.includes("Appointment Rescheduling") || reschedEng.message.includes("current consultation"), "Reschedule (English): Mentions appointment rescheduling");
assert(reschedHin.message.includes("Appointment Rescheduling") || reschedHin.message.includes("Aapki current appointment"), "Reschedule (Hindi): Mentions appointment rescheduling in Hindi");

// Emergency
const erEng = blessyConversationEngine.routeMessage("severe chest pain cannot breathe", false);
const erHin = blessyConversationEngine.routeMessage("seene me dard saans lene me takleef", true);
assert(erEng.message.includes("EMERGENCY ALERT") && erEng.message.includes("911"), "Emergency (English): Contains EMERGENCY ALERT & 911");
assert(erHin.message.includes("EMERGENCY WARNING") && erHin.message.includes("108"), "Emergency (Hindi): Contains EMERGENCY WARNING & 108");

// -----------------------------------------------------------------------------
// TEST 4: VoiceStreamClient Capabilities (Continuous Hands-Free & Dictation)
// -----------------------------------------------------------------------------
console.log("\n👉 TEST 4: Voice Stream Client Continuous Mode & Dictation API");
assert(voiceStreamClient.isContinuousCall === true, "VoiceStreamClient defaults to isContinuousCall === true for hands-free loop");

voiceStreamClient.setContinuousCall(false);
assert(voiceStreamClient.isContinuousCall === false, "setContinuousCall(false) pauses continuous loop");

voiceStreamClient.setContinuousCall(true);
assert(voiceStreamClient.isContinuousCall === true, "setContinuousCall(true) resumes continuous loop");

assert(typeof voiceStreamClient.startDictation === 'function', "startDictation API exists on VoiceStreamClient");
assert(typeof voiceStreamClient.stopDictation === 'function', "stopDictation API exists on VoiceStreamClient");

console.log("\n================================================================================");
console.log(`STEP 3 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================================");
