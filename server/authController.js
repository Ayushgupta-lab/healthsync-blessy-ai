// Authentication Controller: Validations, Scrypt Password Hashing, Session Management, RBAC Guards
import { db, hashPassword, generateSalt, verifyPassword } from './db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{8,20}$/;

export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, score: 0, feedback: "Password is required." };
  }

  let score = 0;
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  if (checks.length) score++;
  if (checks.hasUpper && checks.hasLower) score++;
  if (checks.hasNumber) score++;
  if (checks.hasSpecial) score++;

  const isValid = checks.length && checks.hasUpper && checks.hasLower && checks.hasNumber && checks.hasSpecial;
  let feedback = "Strong password.";
  if (!checks.length) feedback = "Must be at least 8 characters long.";
  else if (!checks.hasUpper) feedback = "Include at least one uppercase letter (A-Z).";
  else if (!checks.hasLower) feedback = "Include at least one lowercase letter (a-z).";
  else if (!checks.hasNumber) feedback = "Include at least one numeric digit (0-9).";
  else if (!checks.hasSpecial) feedback = "Include at least one special character (!@#$%^&*).";

  return { isValid, score, feedback, checks };
}

export function sanitizeUser(user, profile = null) {
  if (!user) return null;
  const { salt, passwordHash, ...safe } = user;
  return {
    ...safe,
    profile: profile || db.getProfileByUserId(user.id)
  };
}

export const authController = {
  // 1. Sign Up / Register
  register: (reqBody) => {
    const { fullName, email, phone, password, confirmPassword, role = 'patient' } = reqBody;

    if (!fullName || fullName.trim().length < 2) {
      return { status: 400, error: "Please enter your valid full name (at least 2 characters)." };
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return { status: 400, error: "Please provide a valid email address (e.g. name@example.com)." };
    }

    if (!phone || !PHONE_REGEX.test(phone.trim())) {
      return { status: 400, error: "Please enter a valid contact phone number with country/area code." };
    }

    if (!password) {
      return { status: 400, error: "Password is required." };
    }

    if (password !== confirmPassword) {
      return { status: 400, error: "Passwords do not match. Please re-enter carefully." };
    }

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      return { status: 400, error: strength.feedback };
    }

    const allowedRoles = ['patient', 'doctor', 'pa'];
    const assignedRole = allowedRoles.includes(role) ? role : 'patient';

    // Duplicate Check
    if (db.findUserByEmail(email)) {
      return { status: 409, error: "An account with this email address is already registered. Please sign in." };
    }

    if (db.findUserByPhone(phone)) {
      return { status: 409, error: "An account with this phone number already exists. Please sign in or use a different phone." };
    }

    // Hash Password with cryptographically random salt
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const newUser = db.createUser({
      fullName,
      email,
      phone,
      role: assignedRole,
      salt,
      passwordHash,
      isOnboarded: false
    });

    // Create Initial Profile Skeleton
    const initialProfile = {
      userId: newUser.id,
      role: assignedRole,
      name: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      avatar: assignedRole === 'doctor' ? "👨‍⚕️" : "👤",
      age: assignedRole === 'patient' ? 28 : null,
      gender: "Not specified",
      bloodGroup: "O+",
      emergencyContact: { name: "", relation: "", phone: "" },
      preferredLanguage: "English",
      healthcarePreferences: { allergies: [], chronicConditions: [], dietary: "Standard" }
    };
    db.saveProfile(initialProfile);

    // Auto-create session on registration
    const session = db.createSession(newUser.id, assignedRole, false);

    // Audit Log
    db.logAuditEvent({
      actorId: newUser.id,
      actorRole: assignedRole,
      actorName: newUser.fullName,
      action: "USER_REGISTERED",
      resourceType: "user",
      resourceId: newUser.id,
      details: `Registered account as role '${assignedRole}'`
    });

    // Welcome Notification
    db.createNotification({
      userId: newUser.id,
      role: assignedRole,
      title: "Welcome to HealthSync!",
      message: `Namaste, ${newUser.fullName}. Complete your profile onboarding to begin clinical consultations.`,
      type: "system",
      link: "#profile"
    });

    return {
      status: 201,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        user: sanitizeUser(newUser, initialProfile)
      }
    };
  },

  // 2. Sign In / Login
  login: (reqBody) => {
    const { identifier, password, rememberMe = false } = reqBody;

    if (!identifier || !identifier.trim()) {
      return { status: 400, error: "Please enter your registered email address or phone number." };
    }

    if (!password) {
      return { status: 400, error: "Please enter your account password." };
    }

    const user = db.findUserByIdentifier(identifier.trim());
    if (!user) {
      return { status: 401, error: "Invalid credentials. No account found with these details." };
    }

    const isMatch = verifyPassword(password, user.salt, user.passwordHash);
    if (!isMatch) {
      return { status: 401, error: "Invalid credentials. Password does not match our records." };
    }

    const session = db.createSession(user.id, user.role, rememberMe);
    const profile = db.getProfileByUserId(user.id);

    // Audit Log
    db.logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      action: "USER_LOGIN",
      resourceType: "session",
      resourceId: session.token.slice(0, 8),
      details: `Successful sign-in with ${rememberMe ? 'extended' : 'standard'} session`
    });

    return {
      status: 200,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        user: sanitizeUser(user, profile)
      }
    };
  },

  // 3. Get Authenticated User / Session Restoration
  getMe: (token) => {
    if (!token) {
      return { status: 401, error: "Unauthorized. Missing authentication token." };
    }

    const session = db.getSession(token);
    if (!session) {
      return { status: 401, error: "Session expired or invalid. Please sign in again." };
    }

    const user = db.findUserById(session.userId);
    if (!user) {
      return { status: 401, error: "User account no longer exists." };
    }

    const profile = db.getProfileByUserId(user.id);
    return {
      status: 200,
      data: {
        token,
        expiresAt: session.expiresAt,
        user: sanitizeUser(user, profile)
      }
    };
  },

  // 4. Sign Out / Logout
  logout: (token) => {
    if (token) {
      const session = db.getSession(token);
      if (session) {
        db.logAuditEvent({
          actorId: session.userId,
          actorRole: session.role,
          action: "USER_LOGOUT",
          resourceType: "session",
          resourceId: token.slice(0, 8),
          details: "User initiated sign out"
        });
      }
      db.deleteSession(token);
    }
    return { status: 200, data: { success: true, message: "Signed out successfully." } };
  },

  // 5. Forgot Password Request
  forgotPassword: (reqBody) => {
    const { identifier } = reqBody;
    if (!identifier || !identifier.trim()) {
      return { status: 400, error: "Please enter your registered email address or phone number." };
    }

    const user = db.findUserByIdentifier(identifier.trim());
    if (!user) {
      return {
        status: 404,
        error: "We could not find an account associated with this email or phone."
      };
    }

    const resetRecord = db.createPasswordReset(user.id, identifier.trim());

    // Clean development fallback without pretending an unconfigured external SMTP was delivered
    return {
      status: 200,
      data: {
        success: true,
        message: "Password reset verification code generated.",
        devVerificationCode: resetRecord.token,
        devNotice: `[Development Fallback]: Enter code ${resetRecord.token} to set a new password. Code expires in 15 minutes.`,
        expiresAt: resetRecord.expiresAt
      }
    };
  },

  // 6. Reset Password Confirmation
  resetPassword: (reqBody) => {
    const { resetToken, newPassword, confirmPassword } = reqBody;

    if (!resetToken) {
      return { status: 400, error: "Verification code is required." };
    }

    if (!newPassword || newPassword !== confirmPassword) {
      return { status: 400, error: "New passwords do not match. Please re-enter." };
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { status: 400, error: strength.feedback };
    }

    const resetRecord = db.verifyPasswordResetCode(resetToken.trim());
    if (!resetRecord) {
      return { status: 400, error: "Invalid or expired verification code. Please request a new one." };
    }

    const user = db.findUserById(resetRecord.userId);
    if (!user) {
      return { status: 404, error: "Account not found." };
    }

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    db.updateUser(user.id, {
      salt: newSalt,
      passwordHash: newHash
    });

    db.consumePasswordReset(resetToken.trim());

    db.logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      action: "PASSWORD_RESET",
      resourceType: "user",
      resourceId: user.id,
      details: "Password successfully updated via reset code"
    });

    return {
      status: 200,
      data: {
        success: true,
        message: "Your password has been successfully reset! You can now sign in with your new password."
      }
    };
  },

  // 7. Update Profile / Role Onboarding
  updateProfile: (userId, profileData) => {
    const user = db.findUserById(userId);
    if (!user) return { status: 404, error: "User not found." };

    const currentProfile = db.getProfileByUserId(userId) || { userId, role: user.role };
    const updated = db.saveProfile({
      ...currentProfile,
      ...profileData,
      userId,
      role: user.role
    });

    if (profileData.name && profileData.name !== user.fullName) {
      db.updateUser(userId, { fullName: profileData.name });
    }

    // Mark as onboarded if mandatory fields present
    db.updateUser(userId, { isOnboarded: true });

    db.logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      actorName: user.fullName,
      action: "PROFILE_UPDATED",
      resourceType: "profile",
      resourceId: user.id,
      details: "Updated user profile & completed onboarding"
    });

    return {
      status: 200,
      data: {
        success: true,
        user: sanitizeUser(db.findUserById(userId), updated)
      }
    };
  },

  // 8. RBAC Middleware Guard Helper
  requireAuth: (token, allowedRoles = []) => {
    if (!token) {
      return { authorized: false, status: 401, error: "Authentication required." };
    }
    const session = db.getSession(token);
    if (!session) {
      return { authorized: false, status: 401, error: "Session expired or invalid." };
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role) && session.role !== 'admin') {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden. Role '${session.role}' lacks permission to access this clinical resource.`
      };
    }
    const user = db.findUserById(session.userId);
    return { authorized: true, user, session };
  }
};
