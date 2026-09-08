// Schedule Engine: Handles time calculation, break preservation, OT surgery blockers, and slot allocation
import { storageService } from './storageService.js';

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes) {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

export function isOverlapping(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  let eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  let eB = timeToMinutes(endB);
  if (eA < sA) eA += 1440;
  if (eB < sB) eB += 1440;
  return Math.max(sA, sB) < Math.min(eA, eB);
}

export class ScheduleEngine {
  isDoctorOnLeave(doctorId, dateStr) {
    const doctor = storageService.getDoctorById(doctorId);
    if (!doctor || !doctor.leaves || doctor.leaves.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    for (const l of doctor.leaves) {
      const s = new Date(l.startDate).getTime();
      const e = new Date(l.endDate).getTime();
      if (targetTime >= s && targetTime <= e) return l;
    }
    return null;
  }

  getDoctorActiveSurgery(doctorId, dateStr) {
    const doctor = storageService.getDoctorById(doctorId);
    if (!doctor || !doctor.activeSurgery) return null;
    const sDate = doctor.activeSurgery.targetDate || new Date().toISOString().split('T')[0];
    return sDate === dateStr ? doctor.activeSurgery : null;
  }

  getDaySchedule(doctorId, dateStr, slotDurationMinutes = 30) {
    const doctor = storageService.getDoctorById(doctorId);
    if (!doctor) return [];

    const routine = doctor.routine || {};
    const workStart = routine.workStart || "08:30";
    const workEnd = routine.workEnd || "21:30";
    const slotDuration = parseInt(slotDurationMinutes, 10) || 30;

    // Check if on leave
    const leave = this.isDoctorOnLeave(doctorId, dateStr);
    if (leave) {
      return [{
        doctorId,
        date: dateStr,
        startTime: "00:00",
        endTime: "23:59",
        timeFormatted: "All Day",
        period: "morning",
        status: "leave",
        meta: {
          title: leave.title,
          reason: leave.reason,
          message: `${doctor.name} is on scheduled recess/leave (${leave.startDate} to ${leave.endDate}). Clinic OPD closed.`
        }
      }];
    }

    const activeSurgery = this.getDoctorActiveSurgery(doctorId, dateStr);
    const existingAppointments = storageService.getAppointmentsByDoctor(doctorId).filter(
      a => a.date === dateStr && a.status !== 'cancelled'
    );
    const breaks = routine.breaks || [];

    const slots = [];
    const startM = timeToMinutes(workStart);
    const endM = timeToMinutes(workEnd);

    for (let currentM = startM; currentM < endM; currentM += slotDuration) {
      const slotStartTime = minutesToTime(currentM);
      const slotEndTime = minutesToTime(currentM + slotDuration);

      // Period determination
      const startHour = Math.floor(currentM / 60);
      let period = 'morning';
      if (startHour >= 12 && startHour < 17) period = 'afternoon';
      else if (startHour >= 17) period = 'evening';

      // 1. Surgery conflict
      let surgeryConflict = null;
      if (activeSurgery && isOverlapping(slotStartTime, slotEndTime, activeSurgery.startTime, activeSurgery.endTime)) {
        surgeryConflict = activeSurgery;
      }

      // 2. Break conflict
      let breakConflict = null;
      if (!surgeryConflict) {
        for (const b of breaks) {
          if (isOverlapping(slotStartTime, slotEndTime, b.startTime, b.endTime)) {
            breakConflict = b;
            break;
          }
        }
      }

      // 3. Booked appointment conflict
      const bookingConflict = existingAppointments.find(a => {
        const aptStartM = timeToMinutes(a.time);
        const aptEndM = aptStartM + (a.durationMinutes || slotDuration);
        return isOverlapping(slotStartTime, slotEndTime, a.time, minutesToTime(aptEndM));
      });

      let status = 'available';
      let meta = null;

      if (surgeryConflict) {
        status = 'surgery';
        meta = {
          icon: "🚨",
          procedureName: surgeryConflict.procedureName || "Emergency Surgery (OT)",
          startTime: surgeryConflict.startTime,
          endTime: surgeryConflict.endTime,
          message: `Doctor in OT Surgery (${formatTime12(surgeryConflict.startTime)} - ${formatTime12(surgeryConflict.endTime)})`
        };
      } else if (breakConflict) {
        status = 'break';
        meta = {
          breakName: breakConflict.name,
          breakType: breakConflict.type,
          startTime: breakConflict.startTime,
          endTime: breakConflict.endTime,
          message: `${breakConflict.name} (${formatTime12(breakConflict.startTime)} - ${formatTime12(breakConflict.endTime)})`
        };
      } else if (bookingConflict) {
        status = 'booked';
        meta = {
          appointmentId: bookingConflict.id,
          patientName: bookingConflict.patientName
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
        period,
        status,
        meta
      });
    }

    return slots;
  }

  getNextAvailableSlot(doctorId, targetDate = null) {
    const today = new Date();
    const dateStr = targetDate || new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const slots = this.getDaySchedule(doctorId, dateStr, 30);
    const available = slots.filter(s => s.status === 'available');
    if (available.length > 0) {
      return { date: dateStr, slot: available[0] };
    }
    // Check next day
    const nextDay = new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];
    const nextSlots = this.getDaySchedule(doctorId, nextDay, 30);
    const nextAvail = nextSlots.filter(s => s.status === 'available');
    if (nextAvail.length > 0) {
      return { date: nextDay, slot: nextAvail[0] };
    }
    return null;
  }

  // Shifts overlapping patient bookings when emergency surgery or block occurs
  shiftAppointmentsForSurgery(doctorId, dateStr, startTime, endTime, targetNextDate = null) {
    const appointments = storageService.getAppointmentsByDoctor(doctorId);
    const nextDate = targetNextDate || new Date(new Date(dateStr).getTime() + 86400000).toISOString().split('T')[0];
    const shifted = [];

    appointments.forEach(apt => {
      if (apt.date === dateStr && apt.status !== 'cancelled') {
        const aptStart = apt.time;
        const aptEnd = minutesToTime(timeToMinutes(aptStart) + (apt.durationMinutes || 30));
        if (isOverlapping(aptStart, aptEnd, startTime, endTime)) {
          storageService.updateAppointment(apt.id, {
            date: nextDate,
            status: 'shifted',
            notes: `Auto-shifted from ${dateStr} due to emergency surgery block.`
          });
          shifted.push(apt);
        }
      }
    });

    return { shiftedCount: shifted.length, targetDate: nextDate, shiftedList: shifted };
  }
}

export const scheduleEngine = new ScheduleEngine();
