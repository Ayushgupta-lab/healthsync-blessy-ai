// Automated integration test for Blessy AI Multimodal Vision, Symptom Solution Engine & Booking
import { aiChatbotEngine } from './js/engines/aiChatbotEngine.js';
import { storage } from './js/utils/storage.js';

console.log('=== RUNNING BLESSY AI MULTI-MODAL & CLINICAL LOGIC TESTS ===\n');

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

// Test 1: Wake word greetings identify as Blessy AI
const greeting = aiChatbotEngine.processUserMessage('Hello Blessy');
assert(
  greeting.message.includes('Blessy') && greeting.message.includes('Medical AI Assistant'),
  'Wake word "Hello Blessy" introduces assistant as Blessy Medical AI Assistant'
);

// Test 2: Multi-modal Digital X-Ray analysis
const xrayAttachment = {
  name: 'right_wrist_xray.png',
  type: 'image/png',
  dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
};
const xrayResponse = aiChatbotEngine.processUserMessage('', xrayAttachment);
assert(
  xrayResponse.type === 'medical_analysis' && xrayResponse.analysisData !== undefined,
  'Digital X-Ray attachment triggers medical_analysis response'
);
assert(
  xrayResponse.analysisData.badge.includes('X-Ray'),
  'X-Ray analysis identifies radiologic bone scan'
);
assert(
  xrayResponse.actionChips.some(c => c.action.includes('doc_1') || c.label.includes('Dr. Marcus') || c.label.includes('Akhilesh')),
  'X-Ray analysis recommends Diagnostics & Clinical Specialist (Dr. Marcus Vance / Dr. Akhilesh)'
);

// Test 3: Blood / Pathology Lab report analysis
const reportAttachment = {
  name: 'lipid_profile_blood_report.pdf',
  type: 'application/pdf',
  dataUrl: 'data:application/pdf;base64,JVBERi0xLjAK'
};
const reportResponse = aiChatbotEngine.processUserMessage('Please analyze my blood report', reportAttachment);
assert(
  reportResponse.type === 'medical_analysis' && reportResponse.analysisData.badge.includes('Laboratory'),
  'Blood report attachment triggers laboratory analysis with clinical parameters'
);

// Test 4: Symptom problem-solving (Headache & Migraine)
aiChatbotEngine.resetSession();
const headacheQuery = aiChatbotEngine.processUserMessage('Mujhe subah se bohot severe headache aur nausea feel ho raha hai');
assert(
  headacheQuery.message.includes('Headache') || headacheQuery.message.includes('Sar Dard'),
  'Headache query triggers clinical symptom explanation and causes'
);
assert(
  headacheQuery.message.includes('Immediate') || headacheQuery.message.includes('Aaram') || headacheQuery.message.includes('Relief'),
  'Headache response provides first-aid / home relief advice'
);
assert(
  headacheQuery.actionChips.some(c => c.action.includes('doc_3') || c.label.includes('Priya')),
  'Headache query matches Neurology specialist (Dr. Priya Sharma)'
);

// Test 5: Triage Emergency Detection
const emergencyQuery = aiChatbotEngine.processUserMessage('patient has sudden crushing chest pain and shortness of breath');
assert(
  emergencyQuery.type === 'emergency',
  'Severe symptoms trigger acute emergency triage bypass with ER contacts'
);

// Test 6: Action Chip handler for trigger_upload
const uploadAction = aiChatbotEngine.handleAction('trigger_upload');
assert(
  uploadAction.message.includes('Attachment') || uploadAction.message.includes('📷'),
  'handleAction("trigger_upload") guides user on attaching X-rays and reports'
);

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL BLESSY AI MULTI-MODAL TESTS PASSED PERFECTLY!\n');
}
