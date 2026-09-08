import React, { useState, useEffect } from 'react';
import { ClipboardList, Shield, AlertTriangle, CheckCircle2, Clock, Users, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { apiService } from '../../services/apiService.js';
import { formatTime12 } from '../../services/scheduleEngine.js';

export default function PADashboard({ onOpenVoice }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');

  const loadPAData = async () => {
    try {
      const [anRes, aptsRes, docsRes, logsRes] = await Promise.all([
        apiService.get('/api/analytics'),
        apiService.get('/api/appointments'),
        apiService.get('/api/doctors'),
        apiService.get('/api/audit-logs')
      ]);
      if (anRes) setAnalytics(anRes);
      if (aptsRes && aptsRes.appointments) setAppointments(aptsRes.appointments);
      if (docsRes && docsRes.doctors) setDoctors(docsRes.doctors);
      if (logsRes && logsRes.logs) setAuditLogs(logsRes.logs);
    } catch (err) {
      console.warn("PA dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    loadPAData();
  }, []);

  const handleConfirmAppointment = async (aptId) => {
    try {
      await apiService.put(`/api/appointments/${aptId}`, {
        status: 'confirmed',
        reason: 'Confirmed by Physician Assistant at Front Desk'
      });
      loadPAData();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleShiftToTomorrow = async (aptId) => {
    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    const nextDay = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    try {
      await apiService.put(`/api/appointments/${aptId}`, {
        status: 'shifted',
        date: nextDay,
        reason: 'Shifted by PA due to clinical queue rebalancing'
      });
      loadPAData();
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredAppointments = selectedDoctorFilter === 'all'
    ? appointments
    : appointments.filter(a => a.doctorId === selectedDoctorFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* PA Header */}
      <div className="rounded-3xl border border-brand-border bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/20 px-3 py-1 text-xs font-semibold text-brand-tealLight border border-brand-teal/30 mb-3">
            <ClipboardList className="h-3.5 w-3.5 text-brand-teal" />
            <span>Clinic Front-Desk & Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Today's Operations: {user?.fullName || 'Sarah Jenkins'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Managing OPD patient queues, doctor schedule availability, and verified audit logs across the hospital.
          </p>
        </div>

        <button
          onClick={onOpenVoice}
          className="flex items-center gap-2 rounded-2xl bg-brand-teal px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight transition-all cursor-pointer"
        >
          <span>Blessy PA Assistant</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* PA Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Managed</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{analytics?.totalManaged || appointments.length}</p>
          <span className="text-[10px] text-slate-500">Active consultations</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Calendar Utilization</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{analytics?.calendarUtilization || '91%'}</p>
          <span className="text-[10px] text-slate-500">Across 4 doctor suites</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rescheduled / Shifted</span>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{analytics?.rescheduledCount || 0}</p>
          <span className="text-[10px] text-slate-500">OT emergency rebalances</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Specialists</span>
          <p className="text-2xl font-bold text-sky-400 font-mono mt-1">{doctors.length || 4}</p>
          <span className="text-[10px] text-slate-500">Doctors consulting in OPD</span>
        </div>
      </div>

      {/* Clinic Operations & Appointment Triage Queue */}
      <div className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-brand-border gap-4">
          <div>
            <h3 className="text-base font-bold text-white">OPD Patient Queue & Rescheduling</h3>
            <p className="text-xs text-slate-400">Live clinical dispatch with instant pass validation.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Specialist:</span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="rounded-xl border border-brand-border bg-brand-dark px-3 py-1.5 text-xs text-white"
            >
              <option value="all">All Specialists</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredAppointments.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No appointments in the queue.</p>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-brand-border bg-brand-dark/50 p-4 hover:border-brand-teal/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-brand-tealLight">#{apt.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : apt.status === 'shifted'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {apt.status}
                    </span>
                    <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] text-slate-400 border border-brand-border">
                      {apt.urgency.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{apt.patientName} ({apt.patientPhone})</h4>
                  <p className="text-xs text-slate-300">
                    Consulting: <strong className="text-brand-teal">{apt.doctorName}</strong> • {apt.date} at {formatTime12(apt.time)} ({apt.room})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Symptoms: "{apt.symptoms}"
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {apt.status !== 'confirmed' && (
                    <button
                      onClick={() => handleConfirmAppointment(apt.id)}
                      className="rounded-xl bg-emerald-600/30 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/50 cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    onClick={() => handleShiftToTomorrow(apt.id)}
                    className="rounded-xl bg-amber-600/20 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-600/30 cursor-pointer"
                  >
                    Shift +24h
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Audit Trail */}
      <div className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-brand-teal" />
            <h3 className="text-base font-bold text-white">System Security Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time immutable log</span>
        </div>

        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
          {auditLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">No audit events logged yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-brand-border/60 bg-brand-dark/40 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-brand-tealLight mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.details}</span>
                  <span className="text-[10px] text-slate-500 ml-2">by {log.actorName} ({log.actorRole})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
