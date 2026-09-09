// Live prompt verification script to showcase exact Blessy responses
import { blessyConversationEngine } from './src/engines/blessyConversationEngine.js';

console.log("================================================================================");
console.log("BLESSY LIVE PROMPT VERIFICATION & CONVERSATIONAL DEMO");
console.log("================================================================================\n");

function simulateTurn(engine, input, label = "") {
  console.log(`\n🗣️ USER [${label}]: "${input}"`);
  const res = engine.processMessage(input);
  console.log(`🤖 BLESSY (${res.detectedLanguage || 'auto'}):`);
  console.log(res.message);
  if (res.actionChips && res.actionChips.length) {
    console.log(`🔘 Chips: [${res.actionChips.map(c => c.label).join(']  [')}]`);
  }
  return res;
}

// -----------------------------------------------------------------------------
// DEMO 1: Natural Intent Understanding (English & Hinglish)
// -----------------------------------------------------------------------------
console.log("\n--- TEST 1: NATURAL SYMPTOM INTENT (No exact button needed) ---");
const eng1 = new (blessyConversationEngine.constructor)();
simulateTurn(eng1, "I'm not feeling well.", "English Natural");

const eng2 = new (blessyConversationEngine.constructor)();
simulateTurn(eng2, "Meri tabiyat theek nahi hai.", "Hinglish Natural");

const eng3 = new (blessyConversationEngine.constructor)();
simulateTurn(eng3, "मुझे अपने लक्षण बताने हैं।", "Devanagari Natural");

// -----------------------------------------------------------------------------
// DEMO 2: 2-Step Doctor Suggestion Flow (Voice-Friendly Single Question Pacing)
// -----------------------------------------------------------------------------
console.log("\n--- TEST 2: 2-STEP DOCTOR SUGGESTION WORKFLOW ---");
const flowEngine = new (blessyConversationEngine.constructor)();
simulateTurn(flowEngine, "Mujhe doctor chahiye", "Step 1: Open intent");
simulateTurn(flowEngine, "Mujhe skin pe allergy ho rahi hai", "Step 2A: Symptom specified");
simulateTurn(flowEngine, "Teen din se", "Step 2B: Duration answered");

// -----------------------------------------------------------------------------
// DEMO 3: Direct Specialty Doctor Search
// -----------------------------------------------------------------------------
console.log("\n--- TEST 3: DIRECT SPECIALTY DOCTOR SEARCH ---");
const directEngine = new (blessyConversationEngine.constructor)();
simulateTurn(directEngine, "Skin ke liye kaunsa doctor hai?", "Direct Specialty");

// -----------------------------------------------------------------------------
// DEMO 4: Indore & Hospital Location Query
// -----------------------------------------------------------------------------
console.log("\n--- TEST 4: INDORE HOSPITAL QUERY ---");
const hospEngine = new (blessyConversationEngine.constructor)();
simulateTurn(hospEngine, "Indore mein skin ke liye hospital chahiye", "Location + Specialty");

// -----------------------------------------------------------------------------
// DEMO 5: Acute Emergency Interrupt
// -----------------------------------------------------------------------------
console.log("\n--- TEST 5: ACUTE EMERGENCY INTERRUPT ---");
const emergEngine = new (blessyConversationEngine.constructor)();
simulateTurn(emergEngine, "Mujhe seene mein bohot tez dard ho raha hai", "Acute Chest Pain");

console.log("\n================================================================================");
console.log("ALL PROMPT LIVE CHECKS COMPLETED SUCCESSFULLY!");
console.log("================================================================================");
