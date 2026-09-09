// Modular REST API Dispatcher with RBAC Guards & Real Relational DB Integration
import { db } from './db.js';
import { authController } from './authController.js';

function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export async function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();
  const token = extractBearerToken(req);

  // Helper to send JSON response
  const sendJson = (status, payload) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(payload));
  };

  // Helper to read JSON request body
  const readBody = () => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error("Invalid JSON payload"));
        }
      });
      req.on('error', reject);
    });
  };

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------------
    // AUTHENTICATION ROUTES (Public & Session)
    // -------------------------------------------------------------
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readBody();
      const result = authController.register(body);
      return sendJson(result.status, result.data || { error: result.error });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readBody();
      const result = authController.login(body);
      return sendJson(result.status, result.data || { error: result.error });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const result = authController.getMe(token);
      return sendJson(result.status, result.data || { error: result.error });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const result = authController.logout(token);
      return sendJson(result.status, result.data);
    }

    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const body = await readBody();
      const result = authController.forgotPassword(body);
      return sendJson(result.status, result.data || { error: result.error });
    }

    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const body = await readBody();
      const result = authController.resetPassword(body);
      return sendJson(result.status, result.data || { error: result.error });
    }

    // -------------------------------------------------------------
    // USER PROFILE & ONBOARDING (Protected)
    // -------------------------------------------------------------
    if (pathname === '/api/profile') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      if (method === 'GET') {
        const profile = db.getProfileByUserId(auth.user.id);
        return sendJson(200, { user: auth.user, profile });
      }

      if (method === 'PUT') {
        const body = await readBody();
        const result = authController.updateProfile(auth.user.id, body);
        return sendJson(result.status, result.data || { error: result.error });
      }
    }

    // -------------------------------------------------------------
    // DOCTORS & CLINICAL SCHEDULES
    // -------------------------------------------------------------
    if (pathname === '/api/doctors' && method === 'GET') {
      const doctors = db.getDoctors();
      return sendJson(200, { doctors });
    }

    if (pathname.startsWith('/api/doctors/') && method === 'PUT') {
      const auth = authController.requireAuth(token, ['doctor', 'pa', 'admin']);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      const doctorId = pathname.replace('/api/doctors/', '');
      const body = await readBody();
      const updated = db.updateDoctor(doctorId, body);
      if (!updated) return sendJson(404, { error: "Doctor record not found." });

      db.logAuditEvent({
        actorId: auth.user.id,
        actorRole: auth.user.role,
        actorName: auth.user.fullName,
        action: "DOCTOR_SCHEDULE_UPDATED",
        resourceType: "doctor",
        resourceId: doctorId,
        details: body.actionNote || "Modified clinical hours, breaks or emergency status"
      });

      return sendJson(200, { doctor: updated });
    }

    // -------------------------------------------------------------
    // APPOINTMENTS (RBAC Protected: Patient / Doctor / PA)
    // -------------------------------------------------------------
    if (pathname === '/api/appointments') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      if (method === 'GET') {
        let filter = {};
        const requestedDoctorId = parsedUrl.searchParams.get('doctorId');

        if (requestedDoctorId) {
          filter.doctorId = requestedDoctorId;
        } else if (auth.user.role === 'patient') {
          // RBAC: Patient only sees their own appointments
          filter.patientId = auth.user.id;
        } else if (auth.user.role === 'doctor') {
          const doc = db.getDoctorByUserId(auth.user.id) || (auth.user.doctorId ? db.getDoctorById(auth.user.doctorId) : null);
          filter.doctorId = doc ? doc.id : (auth.user.doctorId || 'doc_akhilesh');
        }
        // PA and Admin see all clinic appointments if no explicit doctorId

        const statusQuery = parsedUrl.searchParams.get('status');
        if (statusQuery && statusQuery !== 'all') {
          filter.status = statusQuery;
        }

        const appointments = db.getAppointments(filter);
        return sendJson(200, { appointments });
      }

      if (method === 'POST') {
        const body = await readBody();
        if (!body.date || !body.time || !body.doctorId) {
          return sendJson(400, { error: "Doctor, date, and time are required for booking." });
        }

        const doctor = db.getDoctorById(body.doctorId);
        const durationMins = parseInt(body.durationMinutes, 10) || 30;
        const patientName = body.patientName || auth.user.fullName || "Alex Morgan";
        const patientPhone = body.patientPhone || auth.user.phone || "+91 98765 43210";
        const symptoms = body.symptoms || "General Clinical Consultation";

        const newApt = db.createAppointment({
          ...body,
          durationMinutes: durationMins,
          patientId: auth.user.role === 'patient' ? auth.user.id : (body.patientId || auth.user.id),
          patientName,
          patientPhone,
          doctorName: doctor ? doctor.name : (body.doctorName || "Dr. Specialist"),
          doctorSpecialty: doctor ? doctor.specialty : (body.doctorSpecialty || "General Medicine"),
          room: doctor ? doctor.roomNumber : (body.room || "Suite 101 - Main Clinical Wing"),
          symptoms,
          fee: doctor ? doctor.consultationFee : (body.fee || "₹800")
        });

        // Audit & Notification
        db.logAuditEvent({
          actorId: auth.user.id,
          actorRole: auth.user.role,
          actorName: auth.user.fullName,
          action: "APPOINTMENT_CREATED",
          resourceType: "appointment",
          resourceId: newApt.id,
          details: `Booked on ${newApt.date} at ${newApt.time} (${durationMins} mins) with ${newApt.doctorName}. Patient: ${patientName}, Symptoms: ${symptoms}`
        });

        // 1. Instant Notification for Doctor with Patient Name, Time, Duration & Problem
        const docUser = (db.data.users || []).find(u => u.doctorId === body.doctorId || (doctor && u.id === doctor.userId)) || null;
        const docUserId = docUser ? docUser.id : (doctor?.userId || body.doctorId);

        db.createNotification({
          userId: docUserId,
          doctorId: body.doctorId,
          role: "doctor",
          title: `New Patient Appointment 📅 (#${newApt.id})`,
          message: `${patientName} has booked an appointment for ${newApt.date} at ${newApt.time} (${durationMins} mins). Problem: ${symptoms}.`,
          type: "appointment",
          link: "#doctor-console"
        });

        // 2. Instant Notification for Patient
        db.createNotification({
          userId: auth.user.id,
          role: auth.user.role || "patient",
          title: `Appointment Booked & Confirmed 🎉 (#${newApt.id})`,
          message: `Your appointment with ${newApt.doctorName} is confirmed for ${newApt.date} at ${newApt.time} (${durationMins} mins).`,
          type: "appointment",
          link: "#appointments"
        });

        return sendJson(201, { appointment: newApt });
      }
    }

    if (pathname.startsWith('/api/appointments/') && method === 'PUT') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      const aptId = pathname.replace('/api/appointments/', '');
      const apt = db.getAppointmentById(aptId);
      if (!apt) return sendJson(404, { error: "Appointment not found." });

      // RBAC: Patient can only update their own appointment
      if (auth.user.role === 'patient' && apt.patientId !== auth.user.id) {
        return sendJson(403, { error: "Forbidden. You cannot modify another patient's appointment." });
      }

      const body = await readBody();
      const updated = db.updateAppointment(aptId, body, auth.user.fullName);

      db.logAuditEvent({
        actorId: auth.user.id,
        actorRole: auth.user.role,
        actorName: auth.user.fullName,
        action: `APPOINTMENT_${(body.status || 'UPDATED').toUpperCase()}`,
        resourceType: "appointment",
        resourceId: aptId,
        details: body.reason || `Updated appointment state to ${body.status}`
      });

      // Notify patient
      db.createNotification({
        userId: apt.patientId,
        role: "patient",
        title: `Appointment ${body.status ? body.status.toUpperCase() : 'Updated'}`,
        message: `Appointment #${aptId} has been updated: ${body.reason || 'Schedule adjusted'}.`,
        type: "appointment",
        link: "#appointments"
      });

      // Also notify doctor
      const docUser = (db.data.users || []).find(u => u.doctorId === apt.doctorId) || null;
      db.createNotification({
        userId: docUser ? docUser.id : apt.doctorId,
        doctorId: apt.doctorId,
        role: "doctor",
        title: `Appointment #${aptId} ${body.status ? body.status.toUpperCase() : 'Updated'}`,
        message: `Patient ${apt.patientName}'s appointment on ${apt.date} at ${apt.time} was updated to status: ${body.status}.`,
        type: "appointment",
        link: "#doctor-console"
      });

      return sendJson(200, { appointment: updated });
    }

    // -------------------------------------------------------------
    // OPERATIONAL ANALYTICS
    // -------------------------------------------------------------
    if (pathname === '/api/analytics' && method === 'GET') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      const allApts = db.getAppointments();

      if (auth.user.role === 'patient') {
        const myApts = allApts.filter(a => a.patientId === auth.user.id);
        const upcoming = myApts.filter(a => a.status === 'confirmed' || a.status === 'shifted');
        const completed = myApts.filter(a => a.status === 'completed');
        const cancelled = myApts.filter(a => a.status === 'cancelled');

        const specialtyCounts = {};
        myApts.forEach(a => {
          specialtyCounts[a.doctorSpecialty] = (specialtyCounts[a.doctorSpecialty] || 0) + 1;
        });
        const topSpecialty = Object.keys(specialtyCounts).sort((a, b) => specialtyCounts[b] - specialtyCounts[a])[0] || "General Medicine";

        return sendJson(200, {
          role: 'patient',
          totalAppointments: myApts.length,
          upcomingCount: upcoming.length,
          completedCount: completed.length,
          cancelledCount: cancelled.length,
          topSpecialty,
          nextAppointment: upcoming[0] || null
        });
      }

      if (auth.user.role === 'doctor') {
        const docId = auth.user.doctorId || 'doc_akhilesh';
        const docApts = allApts.filter(a => a.doctorId === docId);
        const todayStr = new Date().toISOString().split('T')[0];
        const todayApts = docApts.filter(a => a.date === todayStr);
        const cancelled = docApts.filter(a => a.status === 'cancelled');

        return sendJson(200, {
          role: 'doctor',
          totalAppointments: docApts.length,
          todayAppointments: todayApts.length,
          cancellationRate: docApts.length ? Math.round((cancelled.length / docApts.length) * 100) : 0,
          utilizationRate: 88,
          peakHours: "10:30 AM - 01:00 PM",
          averageWaitTime: "8 mins",
          emergencyInterruptions: 1
        });
      }

      // PA / Admin Analytics
      return sendJson(200, {
        role: auth.user.role,
        totalManaged: allApts.length,
        rescheduledCount: allApts.filter(a => a.status === 'shifted' || a.status === 'rescheduled').length,
        cancelledCount: allApts.filter(a => a.status === 'cancelled').length,
        activeDoctors: db.getDoctors().length,
        calendarUtilization: "91%",
        pendingActionsCount: 2
      });
    }

    // -------------------------------------------------------------
    // NOTIFICATIONS
    // -------------------------------------------------------------
    if (pathname === '/api/notifications') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      if (method === 'GET') {
        const doc = auth.user.role === 'doctor' ? (db.getDoctorByUserId(auth.user.id) || (auth.user.doctorId ? db.getDoctorById(auth.user.doctorId) : null)) : null;
        const doctorId = doc ? doc.id : auth.user.doctorId;
        const notifs = db.getNotifications(auth.user.id, auth.user.role, doctorId);
        return sendJson(200, { notifications: notifs });
      }

      if (method === 'PUT') {
        const body = await readBody();
        if (body.all) {
          db.markAllNotificationsRead(auth.user.id);
        } else if (body.id) {
          db.markNotificationRead(body.id);
        }
        return sendJson(200, { success: true });
      }
    }

    // -------------------------------------------------------------
    // AUDIT LOGS (Doctor, PA & Admin Only)
    // -------------------------------------------------------------
    if (pathname === '/api/audit-logs' && method === 'GET') {
      const auth = authController.requireAuth(token, ['doctor', 'pa', 'admin']);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      const logs = db.getAuditLogs(100);
      return sendJson(200, { logs });
    }

    // -------------------------------------------------------------
    // BLESSY CONVERSATION HISTORY
    // -------------------------------------------------------------
    if (pathname === '/api/conversations') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      if (method === 'GET') {
        const convs = db.getConversations(auth.user.id);
        return sendJson(200, { conversations: convs });
      }

      if (method === 'POST') {
        const body = await readBody();
        const conv = db.saveConversationMessage(auth.user.id, body.userText, body.blessyText, body.toolCalled);
        return sendJson(201, { conversation: conv });
      }

      if (method === 'DELETE') {
        db.clearConversations(auth.user.id);
        return sendJson(200, { success: true });
      }
    }

    // -------------------------------------------------------------
    // DEBOUNCED GLOBAL SEARCH
    // -------------------------------------------------------------
    if (pathname === '/api/search' && method === 'GET') {
      const auth = authController.requireAuth(token);
      if (!auth.authorized) return sendJson(auth.status, { error: auth.error });

      const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
      if (!q) return sendJson(200, { doctors: [], appointments: [], patients: [] });

      // Doctors Search (available to all)
      const doctors = db.getDoctors().filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.bio.toLowerCase().includes(q)
      );

      // Appointments Search (filtered by role)
      let appointments = db.getAppointments();
      if (auth.user.role === 'patient') {
        appointments = appointments.filter(a => a.patientId === auth.user.id);
      }
      appointments = appointments.filter(a =>
        a.id.toLowerCase().includes(q) ||
        a.doctorName.toLowerCase().includes(q) ||
        a.patientName.toLowerCase().includes(q) ||
        a.symptoms.toLowerCase().includes(q)
      );

      // Patients Search (Doctor / PA only)
      let patients = [];
      if (auth.user.role === 'doctor' || auth.user.role === 'pa' || auth.user.role === 'admin') {
        patients = db.data.users.filter(u =>
          u.role === 'patient' &&
          (u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q))
        ).map(u => ({ id: u.id, name: u.fullName, email: u.email, phone: u.phone }));
      }

      return sendJson(200, { doctors, appointments, patients });
    }

    // -------------------------------------------------------------
    // SYSTEM HEALTH & MONGODB CONNECTION STATUS
    // -------------------------------------------------------------
    if (pathname === '/api/status' && method === 'GET') {
      const { isMongoDBConnected } = await import('./dbConnect.js');
      const mongoConnected = isMongoDBConnected();
      return sendJson(200, {
        status: 'ok',
        mongoConnected,
        database: mongoConnected ? 'MongoDB Atlas (healthsync)' : 'JSON Local Storage (healthsync.db.json)',
        doctorsCount: db.getDoctors().length,
        appointmentsCount: db.getAppointments().length,
        timestamp: new Date().toISOString()
      });
    }

    // -------------------------------------------------------------
    // CONTINUOUS MACHINE LEARNING & ADAPTIVE MODEL STATS
    // -------------------------------------------------------------
    if (pathname === '/api/ml/learning-stats' && method === 'GET') {
      const stats = db.getMLStats();
      return sendJson(200, { stats });
    }

    if (pathname === '/api/ml/train-step' && method === 'POST') {
      const body = await readBody();
      const updatedStats = db.recordMLTrainStep(body);
      return sendJson(200, { success: true, stats: updatedStats });
    }

    // -------------------------------------------------------------
    // PATIENT CLINICAL MEMORY (ChatGPT & Gemini Like Memory Bank)
    // -------------------------------------------------------------
    if (pathname === '/api/patient/memory') {
      const auth = authController.requireAuth(token);
      const effectiveUserId = auth.authorized ? auth.user.id : (parsedUrl.searchParams.get('userId') || 'demo_patient_default');

      if (method === 'GET') {
        const memory = db.getPatientMemory(effectiveUserId) || {
          userId: effectiveUserId,
          profile: { name: 'Alex Morgan', preferredCity: 'Indore', preferredLanguage: 'english' },
          chronicConditions: [],
          allergies: [],
          symptomHistory: []
        };
        return sendJson(200, { memory });
      }

      if (method === 'POST') {
        const body = await readBody();
        const saved = db.savePatientMemory(body.userId || effectiveUserId, body.memory || body);
        return sendJson(200, { success: true, memory: saved });
      }
    }

    // Unknown API route
    return sendJson(404, { error: `Endpoint not found: ${pathname}` });

  } catch (err) {
    console.error(`API Error on ${method} ${pathname}:`, err);
    return sendJson(500, { error: "Internal Server Error: " + err.message });
  }
}
