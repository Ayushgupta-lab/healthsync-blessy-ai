// Clinical Tools: Deterministic function-calling tools for Blessy Voice & Front Desk AI
import { storageService } from './storageService.js';
import { scheduleEngine, formatTime12 } from './scheduleEngine.js';

export const clinicalTools = {
  // 1. Check Slot Availability with Conflict Breakdown & Alternate Recommendations
  checkSlotAvailability({ doctorId = "doc_akhilesh", date, timePreference = null, durationMinutes = 30 }) {
    const targetDate = date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const doctor = storageService.getDoctorById(doctorId);
    const slots = scheduleEngine.getDaySchedule(doctorId, targetDate, durationMinutes);

    if (slots.length === 1 && slots[0].status === 'leave') {
      return {
        success: false,
        status: 'doctor_on_leave',
        message: `${doctor.name} is on leave on ${targetDate}.`,
        leaveInfo: slots[0].meta,
        alternatives: []
      };
    }

    const availableSlots = slots.filter(s => s.status === 'available');

    if (timePreference) {
      const match = slots.find(s => s.startTime === timePreference);
      if (match && match.status === 'available') {
        return {
          success: true,
          status: 'slot_available',
          doctor: { id: doctor.id, name: doctor.name, specialty: doctor.specialty },
          date: targetDate,
          requestedSlot: match,
          isAvailable: true,
          alternatives: availableSlots.slice(0, 3)
        };
      } else {
        const conflictReason = match ? match.meta?.message || match.status : 'Outside clinic operating hours';
        return {
          success: false,
          status: 'slot_conflict',
          isAvailable: false,
          doctor: { id: doctor.id, name: doctor.name },
          date: targetDate,
          requestedTime: timePreference,
          conflictReason,
          alternatives: availableSlots.slice(0, 2)
        };
      }
    }

    return {
      success: true,
      status: 'day_summary',
      doctor: { id: doctor.id, name: doctor.name },
      date: targetDate,
      totalAvailable: availableSlots.length,
      availableSlots: availableSlots.slice(0, 8),
      allSlots: slots
    };
  },

  // 2. Deterministic Appointment Booking
  bookAppointment({
    doctorId = "doc_akhilesh",
    date,
    time,
    patientName,
    patientPhone,
    patientAge = 30,
    bloodGroup = "O+",
    symptoms = "General Clinical Consultation",
    urgency = "routine",
    fee = null
  }) {
    if (!date || !time || !patientName || !patientPhone) {
      return { success: false, error: "Missing required parameters: date, time, patientName, patientPhone" };
    }

    const doctor = storageService.getDoctorById(doctorId);
    const check = this.checkSlotAvailability({ doctorId, date, timePreference: time });

    if (!check.isAvailable && check.status !== 'day_summary') {
      return {
        success: false,
        error: `Slot ${formatTime12(time)} on ${date} is not available: ${check.conflictReason}`,
        alternatives: check.alternatives
      };
    }

    const consultationFee = fee || doctor.consultationFee;
    const appointment = storageService.saveAppointment({
      doctorId,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      room: doctor.roomNumber,
      date,
      time,
      durationMinutes: 30,
      patientName,
      patientPhone,
      patientAge: parseInt(patientAge, 10) || 30,
      bloodGroup,
      symptoms,
      urgency,
      status: 'confirmed',
      fee: consultationFee
    });

    return {
      success: true,
      appointment,
      summary: `Appointment booked with ${doctor.name} on ${date} at ${formatTime12(time)}. Room: ${doctor.roomNumber}.`
    };
  },

  // 3. Reschedule Appointment
  rescheduleAppointment({ appointmentId, newDate, newTime, reason = "Patient requested time adjustment" }) {
    const appointments = storageService.getAppointments();
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return { success: false, error: `Appointment ${appointmentId} not found.` };

    const check = this.checkSlotAvailability({
      doctorId: apt.doctorId,
      date: newDate,
      timePreference: newTime
    });

    if (!check.isAvailable) {
      return {
        success: false,
        error: `Requested new time ${formatTime12(newTime)} on ${newDate} is unavailable: ${check.conflictReason}`,
        alternatives: check.alternatives
      };
    }

    const updated = storageService.updateAppointment(appointmentId, {
      date: newDate,
      time: newTime,
      status: 'confirmed',
      notes: `Rescheduled from ${apt.date} ${apt.time}. Reason: ${reason}`
    });

    return {
      success: true,
      updatedAppointment: updated,
      message: `Appointment ${appointmentId} successfully moved to ${newDate} at ${formatTime12(newTime)}.`
    };
  },

  // 4. Block Doctor Calendar (Surgeries, Emergencies, Seminars) & Auto-Shift
  blockDoctorCalendar({
    doctorId = "doc_akhilesh",
    date,
    startTime,
    endTime,
    reason = "Emergency Operation Theatre (OT)",
    shiftAppointmentsNextDay = true
  }) {
    const doctor = storageService.getDoctorById(doctorId);
    const targetDate = date || new Date().toISOString().split('T')[0];

    const surgeryData = {
      id: `SURG-${Date.now()}`,
      procedureName: reason,
      startTime,
      endTime,
      targetDate,
      otRoom: "OT-1 Surgical Ward"
    };

    storageService.updateDoctor(doctorId, {
      status: 'in_surgery',
      statusNote: `${reason} (${formatTime12(startTime)} - ${formatTime12(endTime)})`,
      activeSurgery: surgeryData
    });

    let shiftResult = { shiftedCount: 0, shiftedList: [] };
    if (shiftAppointmentsNextDay) {
      shiftResult = scheduleEngine.shiftAppointmentsForSurgery(doctorId, targetDate, startTime, endTime);
    }

    return {
      success: true,
      doctor: doctor.name,
      blockedRange: `${formatTime12(startTime)} to ${formatTime12(endTime)} on ${targetDate}`,
      reason,
      impactedAppointmentsShifted: shiftResult.shiftedCount,
      shiftedTargetDate: shiftResult.targetDate,
      message: `Doctor calendar blocked from ${formatTime12(startTime)} to ${formatTime12(endTime)}. ${shiftResult.shiftedCount} overlapping patient appointment(s) moved to ${shiftResult.targetDate}.`
    };
  },

  // 5. Report Emergency Triage & Hold Non-Critical Booking
  reportEmergency({ patientName = "Unknown Patient", symptoms, location = "Not specified", urgencyLevel = "CRITICAL_ER" }) {
    const emergencyRecord = {
      id: `ER-${Date.now()}`,
      patientName,
      symptoms,
      urgencyLevel,
      location,
      contactsProvided: ["108 (National Ambulance Helpline)", "911 / 112 (Emergency Medical)", "+91-98765-00000 (Apex Trauma ER)"],
      bookingHeld: true,
      timestamp: new Date().toISOString()
    };

    try {
      storageService.saveEmergency(emergencyRecord);
    } catch (e) {
      console.warn("Could not persist emergency record:", e);
    }

    return {
      success: true,
      emergencyRecord,
      directive: "IMMEDIATE_INTERRUPT",
      safetyMessage: `🚨 EMERGENCY ALERT: Acute symptoms reported (${symptoms}). Non-urgent outpatient booking held. Directing patient to nearest 24/7 Emergency Room.`,
      emergencyContacts: emergencyRecord.contactsProvided
    };
  },

  // 6. Set Doctor Leave (Blocks Outpatient Calendar & Auto-Shifts Bookings)
  setDoctorLeave({ doctorId = "doc_akhilesh", startDate, endDate, reason = "Personal Leave / Out of Office" }) {
    const doctor = storageService.getDoctorById(doctorId);
    const targetStart = startDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const targetEnd = endDate || targetStart;

    const leaveRecord = {
      id: `leave_${Date.now()}`,
      title: reason || "Doctor Scheduled Leave",
      startDate: targetStart,
      endDate: targetEnd,
      reason,
      type: "leave"
    };

    const existingLeaves = doctor.leaves || [];
    const updatedLeaves = [...existingLeaves, leaveRecord];

    storageService.updateDoctor(doctorId, {
      leaves: updatedLeaves,
      status: 'on_leave',
      statusNote: `On leave on ${targetStart}`
    });

    // Auto-shift overlapping appointments for that day to next available date
    const shiftResult = scheduleEngine.shiftAppointmentsForSurgery(doctorId, targetStart, "08:00", "22:00");

    return {
      success: true,
      leaveRecord,
      doctor: doctor.name,
      shiftedAppointments: shiftResult.shiftedCount,
      shiftedTargetDate: shiftResult.targetDate,
      message: `Leave recorded for ${doctor.name} on ${targetStart}. ${shiftResult.shiftedCount} overlapping appointment(s) moved to ${shiftResult.targetDate}.`
    };
  }
};
