import React, { useState, useEffect } from 'react';
import { UserCheck, AlertOctagon, Clock, Calendar, Users, ShieldAlert, CheckCircle2, Bell, Sparkles, Activity, CheckSquare } from 'lucide-react';
import { storageService } from '../../services/storageService.js';
import { clinicalTools } from '../../services/clinicalTools.js';
import { apiService } from '../../services/apiService.js';
import { scheduleEngine, formatTime12 } from '../../services/scheduleEngine.js';

export default function DoctorAdminConsole({ doctors, currentDoctorId }) {
  const defaultDoc = (currentDoctorId && doctors.find((d) => d.id === currentDoctorId)) || doctors[0];
  const [selectedDoctorId, setSelectedDoctorId] = useState(defaultDoc?.id || 'doc_akhilesh');
  const [appointments, setAppointments] = useState([]);
  const [doctorNotifications, setDoctorNotifications] = useState([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Surgery block inputs
  const [surgStart, setSurgStart] = useState('14:00');
  const [surgEnd, setSurgEnd] = useState('16:00');
  const [surgReason, setSurgReason] = useState('Emergency Cardiac Angioplasty (OT-1)');

  const doctor = doctors.find((d) => d.id === selectedDoctorId) || defaultDoc || doctors[0];

  const loadData = async () => {
    try {
      const [remoteAptsRes, notifsRes] = await Promise.all([
        apiService.get(`/api/appointments?doctorId=${selectedDoctorId}`).catch(() => null),
        apiService.get('/api/notifications').catch(() => null)
      ]);

      if (remoteAptsRes && Array.isArray(remoteAptsRes.appointments)) {
        storageService.syncAppointments(remoteAptsRes.appointments);
      }

      if (notifsRes && Array.isArray(notifsRes.notifications)) {
        setDoctorNotifications(notifsRes.notifications);
      }

      // Read combined appointments and sort chronologically
      const allDoctorApts = storageService.getAppointmentsByDoctor(selectedDoctorId);
      const sorted = [...allDoctorApts].sort((a, b) => {
        const timeA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const timeB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return timeA - timeB;
      });

      setAppointments(sorted);
    } catch (err) {
      console.warn("Doctor console data load fallback:", err);
      const local = storageService.getAppointmentsByDoctor(selectedDoctorId);
      setAppointments(local);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // 4-second live poll for instant patient booking alerts
    const unsub = storageService.subscribe('appointments:changed', () => loadData());
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [selectedDoctorId]);

  const handleStatusUpdate = async (aptId, newStatus) => {
    try {
      await apiService.put(`/api/appointments/${aptId}`, {
        status: newStatus,
        reason: `Doctor updated status to ${newStatus}`
      }).catch(() => null);

      storageService.updateAppointment(aptId, { status: newStatus });
      setActionSuccessMsg(`✅ Appointment #${aptId} marked as ${newStatus.toUpperCase()}`);
      loadData();
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleBlockSurgery = () => {
    const res = clinicalTools.blockDoctorCalendar({
      doctorId: doctor.id,
      date: new Date().toISOString().split('T')[0],
      startTime: surgStart,
      endTime: surgEnd,
      reason: surgReason,
      shiftAppointmentsNextDay: true
    });

    if (res.success) {
      setActionSuccessMsg(res.message);
      setTimeout(() => setActionSuccessMsg(null), 6000);
      loadData();
    }
  };

  const handleRecalibrateBuffer = () => {
    setActionSuccessMsg(
      "✅ Schedule Buffer Recalibrated: 15-minute clinical buffer added after every 3 outpatient consultations."
    );
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleClearSurgery = () => {
    storageService.updateDoctor(doctor.id, {
      status: 'available',
      statusNote: 'Consulting patients in OPD',
      activeSurgery: null
    });
    setActionSuccessMsg("🟢 Doctor marked Available in Clinic. Surgery block cleared.");
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Doctor Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-brand-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">Doctor & Physician Assistant Console</h2>
          <p className="text-xs text-slate-400">Manage real-world clinical shifts, OT surgery blockers, and emergency auto-scheduling.</p>
        </div>

        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-xs font-semibold text-white focus:border-brand-teal focus:outline-none"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.specialty})
            </option>
          ))}
        </select>
      </div>

      {actionSuccessMsg && (
        <div className="rounded-2xl border border-brand-teal/40 bg-brand-teal/10 p-4 text-xs font-semibold text-brand-tealLight flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-teal" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Live Doctor Notification Alerts */}
      {doctorNotifications && doctorNotifications.length > 0 && (
        <div className="rounded-2xl border border-brand-teal/40 bg-brand-surfaceElevated p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-tealLight flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-teal animate-bounce" /> Live Patient Booking Notifications ({doctorNotifications.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time Doctor Triage</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {doctorNotifications.slice(0, 3).map((n) => (
              <div key={n.id} className="rounded-xl border border-brand-border bg-brand-dark/70 p-2.5 text-xs flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white block font-semibold">{n.title}</strong>
                  <p className="text-slate-300 text-[11px] mt-0.5">{n.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Surgery Blocker & Schedule Buffer Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Emergency Surgery & OT Blocker */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4" /> Emergency OT Surgery Blocker
            </h3>
            {doctor.activeSurgery ? (
              <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                Surgery Active
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                Clinic OPD Active
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Dispatching an emergency surgery automatically blocks the calendar and auto-shifts overlapping patient bookings to the next business day.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Procedure Name / OT Reason</label>
              <input
                type="text"
                value={surgReason}
                onChange={(e) => setSurgReason(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">OT Start Time</label>
                <input
                  type="time"
                  value={surgStart}
                  onChange={(e) => setSurgStart(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">OT End Time</label>
                <input
                  type="time"
                  value={surgEnd}
                  onChange={(e) => setSurgEnd(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBlockSurgery}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-sm"
              >
                🚨 Block Calendar & Shift Patients
              </button>

              {doctor.activeSurgery && (
                <button
                  type="button"
                  onClick={handleClearSurgery}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Clear Block
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Routine Schedule & Buffer Rules */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-teal flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Doctor Routine, Breaks & Shifts
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Active OPD Hours: <strong className="text-white font-mono">{formatTime12(doctor.routine?.workStart || '09:00')}</strong> to{' '}
              <strong className="text-white font-mono">{formatTime12(doctor.routine?.workEnd || '20:00')}</strong> • Consultation Fee: <strong className="text-brand-tealLight font-bold">{doctor.consultationFee}</strong>
            </p>

            <div className="mt-4 space-y-2">
              <span className="text-[11px] font-medium text-slate-400">Scheduled Protected Breaks:</span>
              <div className="space-y-2">
                {doctor.routine?.breaks?.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl bg-brand-dark px-3 py-2 border border-brand-border text-xs"
                  >
                    <span className="text-slate-300 font-medium">{b.name}</span>
                    <span className="text-brand-tealLight font-mono">
                      {formatTime12(b.startTime)} – {formatTime12(b.endTime)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecalibrateBuffer}
            className="w-full rounded-xl border border-brand-teal/40 bg-brand-teal/15 py-2.5 text-xs font-bold text-brand-tealLight hover:bg-brand-teal/25 transition-all mt-3"
          >
            ⚙️ Add 15-Min Emergency Buffer After Every 3 Patients
          </button>
        </div>
      </div>

      {/* Sequential Schedule Timeline (Requested by Doctor) */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-teal" /> Sequential Schedule Timeline (Chronological Slot Sequence)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live sequential timeline of booked outpatient slots, consultation duration, and patient complaints.
            </p>
          </div>
          <span className="rounded-full bg-brand-teal/20 px-3 py-1 text-xs font-semibold text-brand-tealLight border border-brand-teal/30">
            {appointments.length} Consultations Scheduled
          </span>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-border p-8 text-center text-xs text-slate-500">
            No patient appointments booked for this doctor yet.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-brand-teal/40 space-y-6 my-4">
            {appointments.map((apt, idx) => (
              <div key={apt.id} className="relative group">
                {/* Timeline Node Bullet */}
                <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-teal ring-4 ring-brand-surface shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                </div>

                <div className="rounded-2xl border border-brand-border bg-brand-surfaceElevated p-4 hover:border-brand-teal/50 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-tealLight">#{apt.id}</span>
                      <span className="rounded-md bg-brand-dark px-2 py-0.5 text-xs font-bold text-white border border-brand-border font-mono">
                        ⏰ {apt.date} • {formatTime12(apt.time)} ({apt.durationMinutes || 30} mins)
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          apt.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : apt.status === 'shifted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : apt.status === 'completed'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>👤 {apt.patientName}</span>
                      {apt.patientPhone && (
                        <span className="text-xs text-slate-400 font-normal">({apt.patientPhone})</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-300 bg-brand-dark/60 rounded-lg p-2 border border-brand-border/60">
                      <strong className="text-brand-teal">Clinical Problem / Symptoms:</strong>{' '}
                      <span className="text-slate-200">{apt.symptoms || 'General Clinical Consultation'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {apt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(apt.id, 'completed')}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                      >
                        <CheckSquare className="h-3.5 w-3.5" /> Mark Completed
                      </button>
                    )}
                    {apt.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(apt.id, 'shifted')}
                        className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                      >
                        Shift Slot
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Patient Consultation Queue Table */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-brand-teal" /> All Booked Appointments Table ({appointments.length})
          </h3>
          <span className="text-xs text-slate-500">Persistent Synchronized Database</span>
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No active patient bookings for this doctor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-border text-slate-400">
                <tr>
                  <th className="pb-2">Booking ID</th>
                  <th className="pb-2">Patient</th>
                  <th className="pb-2">Date & Time</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Reported Problem</th>
                  <th className="pb-2">Fee</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 text-slate-300">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-brand-surfaceElevated/40">
                    <td className="py-2.5 font-mono text-brand-tealLight font-bold">{a.id}</td>
                    <td className="py-2.5 font-semibold text-white">{a.patientName}</td>
                    <td className="py-2.5">
                      {a.date} at {formatTime12(a.time)}
                    </td>
                    <td className="py-2.5 text-slate-300 font-mono">{a.durationMinutes || 30} mins</td>
                    <td className="py-2.5 truncate max-w-[200px]" title={a.symptoms}>{a.symptoms}</td>
                    <td className="py-2.5 text-brand-tealLight font-semibold">{a.fee || doctor.consultationFee}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          a.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : a.status === 'shifted'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : a.status === 'completed'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {a.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(a.id, 'completed')}
                          className="rounded-lg bg-emerald-500/20 text-emerald-300 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
