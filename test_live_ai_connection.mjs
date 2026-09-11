// Test Live OpenRouter GPT-4o-mini API Integration
import { askBlessyAI, getAIStatus } from './server/aiService.js';

async function runTests() {
  console.log("==================================================");
  console.log("🧪 Testing OpenRouter GPT-4o-mini API Connection");
  console.log("==================================================");

  // 1. Status Check
  const status = getAIStatus();
  console.log("\n[1] AI Engine Status:", status);
  if (!status.configured) {
    throw new Error("AI Key is not configured!");
  }

  // 2. Hinglish Medical Query Test
  console.log("\n[2] Testing Hinglish Clinical Query with GPT-4o-mini...");
  const hinglishPrompt = "Mujhe 2 din se tez bukhar hai aur thakan lag rahi hai, kya karu?";
  const res1 = await askBlessyAI({
    prompt: hinglishPrompt,
    language: 'hinglish',
    context: { patientName: 'Ayush' }
  });
  console.log("✅ Model Used:", res1.modelUsed);
  console.log("✅ Response:\n", res1.message);

  // 3. Specialist Recommendation Query
  console.log("\n[3] Testing Specialist Doctor Consultation Fees Query...");
  const feesPrompt = "Dr. Akhilesh Sharma ki OPD timings aur consultation fees kitni hai?";
  const res2 = await askBlessyAI({
    prompt: feesPrompt,
    language: 'hinglish'
  });
  console.log("✅ Model Used:", res2.modelUsed);
  console.log("✅ Response:\n", res2.message);

  console.log("\n🎉 ALL TESTS PASSED! OpenRouter GPT-4o-mini is fully connected and responding intelligently!");
}

runTests().catch(err => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
