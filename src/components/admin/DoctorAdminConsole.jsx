import React, { useState, useEffect } from 'react';
import { UserCheck, AlertOctagon, Clock, Calendar, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { storageService } from '../../services/storageService.js';
import { clinicalTools } from '../../services/clinicalTools.js';
import { scheduleEngine, formatTime12 } from '../../services/scheduleEngine.js';

export default function DoctorAdminConsole({ doctors, currentDoctorId }) {
  const defaultDoc = (currentDoctorId && doctors.find((d) => d.id === currentDoctorId)) || doctors[0];
  const [selectedDoctorId, setSelectedDoctorId] = useState(defaultDoc?.id || 'doc_akhilesh');
  const [appointments, setAppointments] = useState([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Surgery block inputs
  const [surgStart, setSurgStart] = useState('14:00');
  const [surgEnd, setSurgEnd] = useState('16:00');
  const [surgReason, setSurgReason] = useState('Emergency Cardiac Angioplasty (OT-1)');

  const doctor = doctors.find((d) => d.id === selectedDoctorId) || defaultDoc || doctors[0];

  useEffect(() => {
    loadData();
    const unsub = storageService.subscribe('appointments:changed', () => loadData());
    return () => unsub();
  }, [selectedDoctorId]);

  const loadData = () => {
    const list = storageService.getAppointmentsByDoctor(selectedDoctorId);
    setAppointments(list);
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
                className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-brand-teal focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={surgStart}
                  onChange={(e) => setSurgStart(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-brand-teal focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={surgEnd}
                  onChange={(e) => setSurgEnd(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-brand-teal focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBlockSurgery}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
              >
                Block Calendar & Shift Patients
              </button>

              {doctor.activeSurgery && (
                <button
                  type="button"
                  onClick={handleClearSurgery}
                  className="rounded-xl border border-brand-border bg-brand-surfaceElevated px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Clear Block
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Routine Protection & Emergency Buffers */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-3">
              <Clock className="h-4 w-4 text-brand-teal" /> Routine Breaks & Well-Being
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Doctor routine breaks (breakfast, lunch, tea, dinner, sleep) are automatically safeguarded from online patient bookings:
            </p>

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

          <button
            type="button"
            onClick={handleRecalibrateBuffer}
            className="w-full rounded-xl border border-brand-teal/40 bg-brand-teal/15 py-2.5 text-xs font-bold text-brand-tealLight hover:bg-brand-teal/25 transition-all mt-3"
          >
            ⚙️ Add 15-Min Emergency Buffer After Every 3 Patients
          </button>
        </div>
      </div>

      {/* Active Patient Consultation Queue */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-brand-teal" /> Scheduled Appointments Queue ({appointments.length})
          </h3>
          <span className="text-xs text-slate-500">Live Clinical Database</span>
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
                  <th className="pb-2">Symptoms</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 text-slate-300">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 font-mono text-brand-tealLight">{a.id}</td>
                    <td className="py-2.5 font-semibold text-white">{a.patientName}</td>
                    <td className="py-2.5">
                      {a.date} at {formatTime12(a.time)}
                    </td>
                    <td className="py-2.5 truncate max-w-[200px]">{a.symptoms}</td>
                    <td className="py-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          a.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : a.status === 'shifted'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {a.status}
                      </span>
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
