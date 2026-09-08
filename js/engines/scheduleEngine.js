// Schedule Engine: Handles time slot calculations, break conflicts, surgery blocks, leaves, and routine management
import { storage } from '../utils/storage.js';

// Helper: Convert "HH:MM" to total minutes from midnight
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert total minutes to "HH:MM"
export function minutesToTime(minutes) {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper: Format "HH:MM" into "1:00 PM"
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Helper: Check if two time ranges overlap
export function isOverlapping(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  let eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  let eB = timeToMinutes(endB);

  // Handle overnight intervals (e.g. 22:00 - 08:00)
  if (eA < sA) eA += 1440;
  if (eB < sB) eB += 1440;

  return Math.max(sA, sB) < Math.min(eA, eB);
}

// Specific overnight check: returns true if time falls within [start, end)
export function isTimeInInterval(timeStr, startStr, endStr) {
  const t = timeToMinutes(timeStr);
  const s = timeToMinutes(startStr);
  const e = timeToMinutes(endStr);

  if (s <= e) {
    return t >= s && t < e;
  } else {
    // Overnight (e.g., 22:00 to 08:00)
    return t >= s || t < e;
  }
}

export class ScheduleEngine {
  constructor() {}

  // Check if doctor is on Vacation / Conference Leave on dateStr
  isDoctorOnLeave(doctorId, dateStr) {
    const doctor = storage.getDoctorById(doctorId);
    if (!doctor || !doctor.leaves || doctor.leaves.length === 0) return null;

    const targetTime = new Date(dateStr).getTime();
    for (const l of doctor.leaves) {
      const s = new Date(l.startDate).getTime();
      const e = new Date(l.endDate).getTime();
      if (targetTime >= s && targetTime <= e) {
        return l;
      }
    }
    return null;
  }

  // Check if doctor is in active emergency surgery on dateStr
  getDoctorActiveSurgery(doctorId, dateStr) {
    const doctor = storage.getDoctorById(doctorId);
    if (!doctor || !doctor.activeSurgery) return null;

    const surg = doctor.activeSurgery;
    const surgDate = surg.targetDate || new Date().toISOString().split('T')[0];
    if (surgDate === dateStr) {
      return surg;
    }
    return null;
  }

  // Generate slots for a doctor on a specific date (supports variable durations: 15, 30, 45, 60 mins)
  getDaySchedule(doctorId, dateStr, slotDurationMinutes = 30) {
    const doctor = storage.getDoctorById(doctorId);
    if (!doctor) return [];

    const routine = doctor.routine || {};
    const workStart = routine.workStart || "08:00";
    const workEnd = routine.workEnd || "22:00";
    const slotDuration = parseInt(slotDurationMinutes, 10) || routine.slotDurationMinutes || 30;

    // 1. Check if doctor is on Leave / Vacation on this entire date
    const leave = this.isDoctorOnLeave(doctorId, dateStr);
    if (leave) {
      return [{
        doctorId,
        date: dateStr,
        startTime: "00:00",
        endTime: "23:59",
        timeFormatted: "All Day",
        endFormatted: "All Day",
        status: "leave",
        meta: {
          icon: "🌴",
          title: leave.title || "Doctor on Personal Leave / Vacation",
          reason: leave.reason || "Travel / Medical Conference",
          message: `🌴 ${doctor.name} is on scheduled vacation / out-of-station leave (${leave.startDate} to ${leave.endDate}). Clinic OPD closed.`
        }
      }];
    }

    const activeSurgery = this.getDoctorActiveSurgery(doctorId, dateStr);

    const existingAppointments = storage.getAppointmentsByDoctor(doctorId).filter(
      a => a.date === dateStr && a.status !== 'cancelled'
    );

    const breaks = routine.breaks || [];

    const slots = [];
    const startM = timeToMinutes(workStart);
    const endM = timeToMinutes(workEnd);

    for (let currentM = startM; currentM < endM; currentM += slotDuration) {
      const slotStartTime = minutesToTime(currentM);
      const slotEndTime = minutesToTime(currentM + slotDuration);

      // A. Check if collides with Active Emergency Surgery
      let surgeryConflict = null;
      if (activeSurgery) {
        if (isOverlapping(slotStartTime, slotEndTime, activeSurgery.startTime, activeSurgery.endTime)) {
          surgeryConflict = activeSurgery;
        }
      }

      // B. Check if it collides with any Doctor Break (Sleep, Breakfast, Lunch, Dinner, Custom)
      let breakConflict = null;
      if (!surgeryConflict) {
        for (const b of breaks) {
          if (this.slotCollidesWithBreak(slotStartTime, slotEndTime, b.startTime, b.endTime)) {
            breakConflict = b;
            break;
          }
        }
      }

      // C. Check if it collides with an existing booked appointment
      const bookingConflict = existingAppointments.find(a => {
        const aptStartM = timeToMinutes(a.time);
        const aptEndM = aptStartM + (a.durationMinutes || slotDuration);
        return isOverlapping(slotStartTime, slotEndTime, a.time, minutesToTime(aptEndM));
      });

      // D. Determine status
      let status = 'available';
      let meta = null;

      if (surgeryConflict) {
        status = 'surgery';
        meta = {
          icon: "🚨",
          procedureName: surgeryConflict.procedureName || "Emergency Surgery / OT",
          startTime: surgeryConflict.startTime,
          endTime: surgeryConflict.endTime,
          message: `🚨 Doctor in Emergency Operation Theatre (${formatTime12(surgeryConflict.startTime)} - ${formatTime12(surgeryConflict.endTime)}).`
        };
      } else if (breakConflict) {
        status = 'break';
        meta = {
          breakId: breakConflict.id,
          breakName: breakConflict.name,
          breakIcon: breakConflict.icon || '☕',
          breakType: breakConflict.type,
          startTime: breakConflict.startTime,
          endTime: breakConflict.endTime,
          description: breakConflict.description,
          message: `${breakConflict.icon || ''} ${breakConflict.name} (${formatTime12(breakConflict.startTime)} – ${formatTime12(breakConflict.endTime)}): ${breakConflict.description}`
        };
      } else if (bookingConflict) {
        status = 'booked';
        meta = {
          appointmentId: bookingConflict.id,
          patientName: bookingConflict.patientName,
          urgency: bookingConflict.urgency,
          status: bookingConflict.status
        };
      }

      slots.push({
        doctorId,
        date: dateStr,
        startTime: slotStartTime,
        endTime: slotEndTime,
        durationMinutes: slotDuration,
        timeFormatted: formatTime12(slotStartTime),
        endFormatted: formatTime12(slotEndTime),
        status,
        meta
      });
    }

    return slots;
  }

  // Accurate check if a slot intersects with a break interval
  slotCollidesWithBreak(slotStart, slotEnd, breakStart, breakEnd) {
    const sS = timeToMinutes(slotStart);
    const sE = timeToMinutes(slotEnd);
    const bS = timeToMinutes(breakStart);
    const bE = timeToMinutes(breakEnd);

    if (bS < bE) {
      // Normal daytime interval (e.g. 13:00 to 14:00)
      return sS < bE && sE > bS;
    } else {
      // Overnight interval (e.g. 22:00 to 08:00)
      return sS >= bS || sE <= bE || (sS < bE && sE > 0);
    }
  }

  // Validate a specific slot request
  validateSlot(doctorId, dateStr, timeStr, durationMinutes = 30) {
    const doctor = storage.getDoctorById(doctorId);
    if (!doctor) return { valid: false, reason: 'DOCTOR_NOT_FOUND' };

    // 1. Leave Check
    const leave = this.isDoctorOnLeave(doctorId, dateStr);
    if (leave) {
      return {
        valid: false,
        reason: 'DOCTOR_ON_LEAVE',
        leaveDetails: leave,
        message: `${doctor.name} is on scheduled leave/vacation (${leave.startDate} to ${leave.endDate}).`
      };
    }

    const slotStartM = timeToMinutes(timeStr);
    const slotEndM = slotStartM + (parseInt(durationMinutes, 10) || 30);
    const slotEndTime = minutesToTime(slotEndM);

    // 2. Emergency Surgery Check
    const surgery = this.getDoctorActiveSurgery(doctorId, dateStr);
    if (surgery && isOverlapping(timeStr, slotEndTime, surgery.startTime, surgery.endTime)) {
      return {
        valid: false,
        reason: 'DOCTOR_IN_SURGERY',
        surgeryDetails: surgery,
        message: `${doctor.name} is in an Emergency Operation (${surgery.startTime} - ${surgery.endTime}).`
      };
    }

    const routine = doctor.routine || {};
    const workStartM = timeToMinutes(routine.workStart || "08:00");
    const workEndM = timeToMinutes(routine.workEnd || "22:00");

    // 3. Operational Clinic Hours Check
    if (slotStartM < workStartM || slotEndM > workEndM) {
      return {
        valid: false,
        reason: 'OFF_HOURS',
        message: `Consultation hours for ${doctor.name} are ${formatTime12(routine.workStart)} to ${formatTime12(routine.workEnd)}.`
      };
    }

    // 4. Breaks Check
    const breaks = routine.breaks || [];
    for (const b of breaks) {
      if (this.slotCollidesWithBreak(timeStr, slotEndTime, b.startTime, b.endTime)) {
        return {
          valid: false,
          reason: 'DOCTOR_ON_BREAK',
          breakDetails: b,
          message: `${doctor.name} is having ${b.name} (${formatTime12(b.startTime)} to ${formatTime12(b.endTime)}).`
        };
      }
    }

    // 5. Existing Appointment Conflict
    const appointments = storage.getAppointmentsByDoctor(doctorId).filter(
      a => a.date === dateStr && a.status !== 'cancelled'
    );

    const conflict = appointments.find(a => {
      const aStartM = timeToMinutes(a.time);
      const aEndM = aStartM + (a.durationMinutes || 30);
      return isOverlapping(timeStr, slotEndTime, a.time, minutesToTime(aEndM));
    });

    if (conflict) {
      return {
        valid: false,
        reason: 'ALREADY_BOOKED',
        conflictAppointment: conflict,
        message: `This slot is already reserved.`
      };
    }

    return { valid: true };
  }

  // Suggest alternative available slots nearest to preferred time
  findAlternativeSlots(doctorId, dateStr, preferredTimeStr, count = 3, durationMinutes = 30) {
    const slots = this.getDaySchedule(doctorId, dateStr, durationMinutes);
    const availableSlots = slots.filter(s => s.status === 'available');

    if (availableSlots.length === 0) {
      // Check next day
      const nextDay = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];
      const nextDaySlots = this.getDaySchedule(doctorId, nextDay, durationMinutes).filter(s => s.status === 'available');
      return nextDaySlots.slice(0, count);
    }

    const prefM = timeToMinutes(preferredTimeStr);
    // Sort by proximity
    availableSlots.sort((a, b) => {
      const distA = Math.abs(timeToMinutes(a.startTime) - prefM);
      const distB = Math.abs(timeToMinutes(b.startTime) - prefM);
      return distA - distB;
    });

    return availableSlots.slice(0, count);
  }

  // Bulk Shift Appointments when doctor goes to surgery
  shiftAppointmentsForSurgery(doctorId, dateStr, startTime, endTime, targetDateStr) {
    const appointments = storage.getAppointments();
    let shiftedCount = 0;
    const shiftedList = [];

    appointments.forEach(apt => {
      if (apt.doctorId === doctorId && apt.date === dateStr && apt.status !== 'cancelled') {
        const aptStartM = timeToMinutes(apt.time);
        const aptEndM = aptStartM + (apt.durationMinutes || 30);
        if (isOverlapping(apt.time, minutesToTime(aptEndM), startTime, endTime)) {
          storage.updateAppointment(apt.id, {
            date: targetDateStr,
            status: 'confirmed',
            aiTriageNote: `${apt.aiTriageNote || ''} [Shifted automatically: Doctor called into emergency surgery during ${startTime}-${endTime} on ${dateStr}; relocated to ${targetDateStr}].`
          });
          shiftedCount++;
          shiftedList.push(apt);
        }
      }
    });

    return { shiftedCount, shiftedList };
  }

  // Get live real-time status of doctor including breaks, surgeries, delays, and OPD state
  getCurrentStatus(doctor) {
    if (!doctor) return { status: 'off_duty', label: 'Off Duty', details: 'Doctor not found', icon: '🌙' };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. Vacation / Leave Check
    const leave = this.isDoctorOnLeave(doctor.id, todayStr);
    if (leave) {
      return {
        status: 'on_leave',
        label: 'On Vacation / Leave',
        details: `${leave.title} (${leave.startDate} to ${leave.endDate})`,
        icon: '🌴'
      };
    }

    // 2. Active Emergency Surgery Check
    const surgery = this.getDoctorActiveSurgery(doctor.id, todayStr);
    if (surgery && isTimeInInterval(nowTimeStr, surgery.startTime, surgery.endTime)) {
      return {
        status: 'in_surgery',
        label: 'In Emergency Surgery (OT)',
        details: `${surgery.procedureName} in ${surgery.otRoom || 'OT-2'} (${formatTime12(surgery.startTime)} - ${formatTime12(surgery.endTime)})`,
        icon: '🚨'
      };
    }

    // 3. Delay Broadcast Note
    const delayPrefix = doctor.runningDelayMinutes > 0 
      ? `[Running ${doctor.runningDelayMinutes}m behind schedule] ` 
      : '';

    // 4. Breaks Check
    const routine = doctor.routine || {};
    const breaks = routine.breaks || [];

    for (const b of breaks) {
      if (isTimeInInterval(nowTimeStr, b.startTime, b.endTime)) {
        return {
          status: b.type === 'sleep' ? 'off_duty' : 'on_break',
          label: b.name,
          details: `${delayPrefix}${b.description} (${formatTime12(b.startTime)} - ${formatTime12(b.endTime)})`,
          icon: b.icon || '☕'
        };
      }
    }

    // 5. Work Hours Check
    const workStart = routine.workStart || "08:00";
    const workEnd = routine.workEnd || "22:00";

    if (!isTimeInInterval(nowTimeStr, workStart, workEnd)) {
      return {
        status: 'off_duty',
        label: 'Off Duty (Night Rest)',
        details: `Clinic OPD closed. Resumes at ${formatTime12(workStart)}.`,
        icon: '🌙'
      };
    }

    return {
      status: 'available',
      label: doctor.runningDelayMinutes > 0 ? `In Clinic (+${doctor.runningDelayMinutes}m delay)` : 'In Clinic & Available',
      details: `${delayPrefix}${doctor.statusNote || 'Accepting patient consultations.'}`,
      icon: '🟢'
    };
  }
}

export const scheduleEngine = new ScheduleEngine();
