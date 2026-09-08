import React, { useState, useEffect } from 'react';
import { Calendar, Clock, QrCode, MapPin, X, AlertCircle } from 'lucide-react';
import { storageService } from '../../services/storageService.js';
import { clinicalTools } from '../../services/clinicalTools.js';
import { formatTime12 } from '../../services/scheduleEngine.js';

export default function PatientAppointments({ onOpenPass }) {
  const [appointments, setAppointments] = useState([]);
  const [activePassApt, setActivePassApt] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduleResult, setRescheduleResult] = useState(null);

  useEffect(() => {
    loadAppointments();
    const unsub = storageService.subscribe('appointments:changed', () => loadAppointments());
    return () => unsub();
  }, []);

  const loadAppointments = () => {
    const list = storageService.getAppointments();
    setAppointments(list);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!rescheduleApt || !newDate || !newTime) return;

    const res = clinicalTools.rescheduleAppointment({
      appointmentId: rescheduleApt.id,
      newDate,
      newTime,
      reason: "Patient requested adjustment via portal"
    });

    setRescheduleResult(res);
    if (res.success) {
      setTimeout(() => {
        setRescheduleApt(null);
        setRescheduleResult(null);
        loadAppointments();
      }, 1500);
    }
  };

  if (appointments.length === 0) return null;

  return (
    <div className="mt-12 space-y-4">
      <div className="flex items-center justify-between border-b border-brand-border pb-3">
        <div>
          <h3 className="text-lg font-bold text-white">My Scheduled Consultations</h3>
          <p className="text-xs text-slate-400">View active appointment records and access your digital clinic entry passes.</p>
        </div>
        <span className="rounded-full bg-brand-surface px-3 py-1 text-xs font-semibold text-brand-tealLight border border-brand-border">
          {appointments.length} Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {appointments.map((apt) => (
          <div
            key={apt.id}
            className="flex flex-col justify-between rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3 hover:border-brand-borderActive transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-brand-tealLight">{apt.id}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    apt.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : apt.status === 'shifted'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {apt.status}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white mt-1">{apt.doctorName}</h4>
              <p className="text-xs text-brand-teal">{apt.doctorSpecialty}</p>

              <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-brand-teal" />
                  <span>{apt.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-brand-teal" />
                  <span>{formatTime12(apt.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-brand-teal" />
                  <span className="truncate">{apt.room || 'Suite 101 - Main Wing'}</span>
                </div>
              </div>

              {apt.notes && (
                <div className="mt-2 rounded-lg bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20">
                  ⚠️ {apt.notes}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-brand-border/70">
              <button
                type="button"
                onClick={() => setActivePassApt(apt)}
                className="flex-1 rounded-xl bg-brand-teal/20 border border-brand-teal/40 py-2 text-xs font-bold text-brand-tealLight hover:bg-brand-teal/30 flex items-center justify-center gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" /> Digital Pass
              </button>

              <button
                type="button"
                onClick={() => {
                  setRescheduleApt(apt);
                  setNewDate(apt.date);
                  setNewTime(apt.time);
                }}
                className="rounded-xl border border-brand-border bg-brand-surfaceElevated px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Digital Pass Modal */}
      {activePassApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-brand-teal/40 bg-brand-surface p-6 text-center space-y-4 shadow-2xl">
            <button
              onClick={() => setActivePassApt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Verified Clinical Pass</span>
            <h3 className="text-base font-bold text-white">{activePassApt.doctorName}</h3>

            <div className="rounded-xl border border-brand-border bg-brand-dark p-4 text-left font-mono text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>PASS ID:</span>
                <strong className="text-brand-tealLight">{activePassApt.id}</strong>
              </div>
              <div className="flex justify-between">
                <span>PATIENT:</span>
                <span>{activePassApt.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{activePassApt.date}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME:</span>
                <span>{formatTime12(activePassApt.time)}</span>
              </div>
              <div className="flex justify-between">
                <span>ROOM:</span>
                <span>{activePassApt.room}</span>
              </div>
            </div>

            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2 text-slate-900 shadow-inner">
              <QrCode className="h-24 w-24" />
            </div>

            <button
              type="button"
              onClick={() => setActivePassApt(null)}
              className="w-full rounded-xl bg-brand-teal py-2 text-xs font-bold text-white"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-brand-border bg-brand-surface p-6 space-y-4 shadow-2xl">
            <button
              onClick={() => setRescheduleApt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white">Reschedule Appointment</h3>
            <p className="text-xs text-slate-400">
              Move booking <strong className="text-brand-tealLight">{rescheduleApt.id}</strong> ({rescheduleApt.doctorName}) to a new slot:
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-brand-teal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white focus:border-brand-teal focus:outline-none"
                />
              </div>

              {rescheduleResult && !rescheduleResult.success && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{rescheduleResult.error}</span>
                </div>
              )}

              {rescheduleResult && rescheduleResult.success && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
                  {rescheduleResult.message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-teal py-2 text-xs font-bold text-white hover:bg-brand-tealDark"
                >
                  Save New Time
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="rounded-xl border border-brand-border px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
