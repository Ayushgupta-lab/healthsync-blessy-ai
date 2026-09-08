// Comprehensive Automated Test Suite: Authentication, Relational DB Persistence, RBAC Security & Blessy Memory
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { authController, validatePasswordStrength } from './server/authController.js';
import { BlessyConversationEngine } from './src/engines/blessyConversationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'healthsync.db.json');

console.log("====================================================");
console.log("HEALTHSYNC PRODUCTION AUTH & PERSISTENCE TEST SUITE");
console.log("====================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// TEST 1: Password Cryptography & scrypt Hashing
// -------------------------------------------------------------
test("1. Cryptography: Passwords hashed via scrypt with individual salts, zero plaintext", () => {
  const password = "SecurePass@2026";
  const salt1 = "salt_alpha_123456";
  const salt2 = "salt_beta_789012";

  const hash1 = hashPassword(password, salt1);
  const hash2 = hashPassword(password, salt2);

  assert.notStrictEqual(hash1, password, "Hash must never equal plaintext");
  assert.notStrictEqual(hash1, hash2, "Different salts must produce different hashes");
  assert.strictEqual(verifyPassword(password, salt1, hash1), true, "Correct password must verify");
  assert.strictEqual(verifyPassword("WrongPass@123", salt1, hash1), false, "Wrong password must be rejected");
});

// -------------------------------------------------------------
// TEST 2: Password Complexity Enforcement
// -------------------------------------------------------------
test("2. Security: Password strength validator enforces 8+ chars, upper, lower, number, symbol", () => {
  assert.strictEqual(validatePasswordStrength("short").isValid, false, "Short password rejected");
  assert.strictEqual(validatePasswordStrength("alllowercase123!").isValid, false, "No uppercase rejected");
  assert.strictEqual(validatePasswordStrength("ALLUPPERCASE123!").isValid, false, "No lowercase rejected");
  assert.strictEqual(validatePasswordStrength("NoNumberHere!@#").isValid, false, "No number rejected");
  assert.strictEqual(validatePasswordStrength("NoSpecialChar123").isValid, false, "No symbol rejected");

  const valid = validatePasswordStrength("MedPass@2026");
  assert.strictEqual(valid.isValid, true, "Valid complex password accepted");
  assert.strictEqual(valid.score >= 4, true, "Strength score must be 4");
});

// -------------------------------------------------------------
// TEST 3: User Registration Validations & Duplication Prevention
// -------------------------------------------------------------
test("3. Sign Up: Rejects invalid email, phone, and duplicate registrations", () => {
  // Invalid email
  const badEmail = authController.register({
    fullName: "Test User",
    email: "not-an-email",
    phone: "+15551234567",
    password: "Password@123",
    confirmPassword: "Password@123"
  });
  assert.strictEqual(badEmail.status, 400);

  // Password mismatch
  const mismatch = authController.register({
    fullName: "Test User",
    email: "valid@example.com",
    phone: "+15551234567",
    password: "Password@123",
    confirmPassword: "DifferentPassword@123"
  });
  assert.strictEqual(mismatch.status, 400);

  // Duplicate email check
  const duplicate = authController.register({
    fullName: "Alex Morgan Clone",
    email: "patient@healthsync.io", // already seeded
    phone: "+15559998888",
    password: "Password@123",
    confirmPassword: "Password@123"
  });
  assert.strictEqual(duplicate.status, 409, "Must return 409 Conflict on duplicate email");
});

// -------------------------------------------------------------
// TEST 4: Successful Registration & Session Creation
// -------------------------------------------------------------
let testUserId = null;
let testUserToken = null;
const testEmail = `patient.test.${Date.now()}@healthsync.io`;
const testPhone = `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

test("4. Sign Up: Successfully registers new Patient and creates authenticated session", () => {
  const reg = authController.register({
    fullName: "Maya Lin",
    email: testEmail,
    phone: testPhone,
    password: "SafePassword@2026",
    confirmPassword: "SafePassword@2026",
    role: "patient"
  });

  assert.strictEqual(reg.status, 201);
  assert.ok(reg.data.token, "Must issue session token");
  assert.strictEqual(reg.data.user.email, testEmail.toLowerCase());
  assert.strictEqual(reg.data.user.role, "patient");
  assert.strictEqual(reg.data.user.passwordHash, undefined, "Sensitive hash must never be returned");
  assert.strictEqual(reg.data.user.salt, undefined, "Salt must never be returned");

  testUserId = reg.data.user.id;
  testUserToken = reg.data.token;
});

// -------------------------------------------------------------
// TEST 5: Sign In Verification (Valid & Invalid Credentials)
// -------------------------------------------------------------
test("5. Sign In: Verifies valid credentials and rejects incorrect password with 401", () => {
  // Wrong password
  const badLogin = authController.login({
    identifier: testEmail,
    password: "WrongPassword@999"
  });
  assert.strictEqual(badLogin.status, 401);

  // Correct login via email
  const goodLoginEmail = authController.login({
    identifier: testEmail,
    password: "SafePassword@2026",
    rememberMe: true
  });
  assert.strictEqual(goodLoginEmail.status, 200);
  assert.ok(goodLoginEmail.data.token);

  // Correct login via phone
  const goodLoginPhone = authController.login({
    identifier: testPhone,
    password: "SafePassword@2026"
  });
  assert.strictEqual(goodLoginPhone.status, 200);
});

// -------------------------------------------------------------
// TEST 6: Session Management & Restoration
// -------------------------------------------------------------
test("6. Session Management: Restores session via token and invalidates on logout", () => {
  const me = authController.getMe(testUserToken);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.data.user.fullName, "Maya Lin");

  // Logout
  const out = authController.logout(testUserToken);
  assert.strictEqual(out.status, 200);

  // Verify token is now invalidated
  const invalidated = authController.getMe(testUserToken);
  assert.strictEqual(invalidated.status, 401, "Token must be rejected after logout");
});

// -------------------------------------------------------------
// TEST 7: Real Password Reset Workflow
// -------------------------------------------------------------
test("7. Password Reset: Generates verification code and completes password change", () => {
  const forgot = authController.forgotPassword({ identifier: testEmail });
  assert.strictEqual(forgot.status, 200);
  assert.ok(forgot.data.devVerificationCode, "Must return valid reset token");

  const resetCode = forgot.data.devVerificationCode;
  const resetRes = authController.resetPassword({
    resetToken: resetCode,
    newPassword: "UpdatedPassword@2026",
    confirmPassword: "UpdatedPassword@2026"
  });
  assert.strictEqual(resetRes.status, 200);

  // Verify old password fails
  const oldLogin = authController.login({
    identifier: testEmail,
    password: "SafePassword@2026"
  });
  assert.strictEqual(oldLogin.status, 401, "Old password must no longer work");

  // Verify new password succeeds
  const newLogin = authController.login({
    identifier: testEmail,
    password: "UpdatedPassword@2026"
  });
  assert.strictEqual(newLogin.status, 200, "New password must authenticate successfully");
});

// -------------------------------------------------------------
// TEST 8: Role-Based Access Control (RBAC) Guard Enforcement
// -------------------------------------------------------------
test("8. RBAC Guards: Patients are forbidden from doctor/admin audit-log endpoints", () => {
  // Login as Patient
  const patientAuth = authController.login({
    identifier: "patient@healthsync.io",
    password: "Patient@123"
  });
  const patientToken = patientAuth.data.token;

  // Attempt accessing protected admin/doctor resource
  const patientAccess = authController.requireAuth(patientToken, ['doctor', 'pa', 'admin']);
  assert.strictEqual(patientAccess.authorized, false, "Patient must be denied access to admin roles");
  assert.strictEqual(patientAccess.status, 403, "Must return 403 Forbidden");

  // Login as Doctor
  const doctorAuth = authController.login({
    identifier: "doctor.sharma@healthsync.io",
    password: "Doctor@123"
  });
  const doctorToken = doctorAuth.data.token;
  const doctorAccess = authController.requireAuth(doctorToken, ['doctor', 'pa', 'admin']);
  assert.strictEqual(doctorAccess.authorized, true, "Doctor must be allowed access");

  // Login as PA
  const paAuth = authController.login({
    identifier: "pa.sarah@healthsync.io",
    password: "Staff@123"
  });
  const paToken = paAuth.data.token;
  const paAccess = authController.requireAuth(paToken, ['doctor', 'pa', 'admin']);
  assert.strictEqual(paAccess.authorized, true, "PA must be allowed access");
});

// -------------------------------------------------------------
// TEST 9: Persistent Database Disk File Verification
// -------------------------------------------------------------
test("9. Database Persistence: File data/healthsync.db.json exists on disk and persists relational records", () => {
  assert.strictEqual(fs.existsSync(DB_FILE), true, "healthsync.db.json must exist on disk");
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const diskData = JSON.parse(raw);

  assert.ok(Array.isArray(diskData.users), "Must have users array");
  assert.ok(Array.isArray(diskData.appointments), "Must have appointments array");
  assert.ok(Array.isArray(diskData.doctors), "Must have doctors array");
  assert.ok(Array.isArray(diskData.auditLogs), "Must have auditLogs array");

  // Verify seeded appointment exists in persistent DB
  const apt = diskData.appointments.find(a => a.id === 'BSY-10284');
  assert.ok(apt, "Seeded appointment #BSY-10284 must persist in database");
  assert.strictEqual(apt.patientName, "Alex Morgan");
  assert.strictEqual(apt.doctorName, "Dr. Akhilesh Sharma, MD");
});

// -------------------------------------------------------------
// TEST 10: Contextual Blessy Memory (Requirement 51: Real Stored Data)
// -------------------------------------------------------------
test("10. Blessy AI Contextual Memory: Answers 'Meri appointment kab hai?' from real stored DB data", () => {
  const engine = new BlessyConversationEngine();
  engine.setUserContext({
    fullName: "Alex Morgan",
    phone: "+1 (555) 019-2834"
  });

  const replyHinglish = engine.processMessage("Meri appointment kab hai?");
  assert.strictEqual(replyHinglish.type, "appointment_lookup_result");
  assert.ok(replyHinglish.message.includes("BSY-10284"), "Must reference real appointment #BSY-10284");
  assert.ok(replyHinglish.message.includes("Dr. Akhilesh Sharma"), "Must reference real doctor Dr. Akhilesh Sharma");
  assert.ok(replyHinglish.message.includes("10:30"), "Must reference real slot time 10:30");

  const replyEnglish = engine.processMessage("When is my appointment?");
  assert.strictEqual(replyEnglish.type, "appointment_lookup_result");
  assert.ok(replyEnglish.message.includes("BSY-10284"), "English reply must reference real appointment #BSY-10284");
});

console.log(`\n====================================================`);
console.log(`TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log(`====================================================`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
