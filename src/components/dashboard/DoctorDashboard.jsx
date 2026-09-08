import React, { useState, useEffect } from 'react';
import { Stethoscope, Sparkles, Clock, AlertTriangle, ShieldCheck, Activity, Users, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { apiService } from '../../services/apiService.js';
import DoctorAdminConsole from '../admin/DoctorAdminConsole.jsx';

export default function DoctorDashboard({ onOpenVoice }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    async function loadDoctorData() {
      try {
        const [anRes, docRes] = await Promise.all([
          apiService.get('/api/analytics'),
          apiService.get('/api/doctors')
        ]);
        if (anRes) setAnalytics(anRes);
        if (docRes && docRes.doctors) setDoctors(docRes.doctors);
      } catch (e) {
        console.warn(e);
      }
    }
    loadDoctorData();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Personalized Doctor Header */}
      <div className="rounded-3xl border border-brand-border bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/20 px-3 py-1 text-xs font-semibold text-brand-tealLight border border-brand-teal/30 mb-3">
            <Stethoscope className="h-3.5 w-3.5 text-brand-teal" />
            <span>Chief Clinical Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Good morning, Dr. {user?.fullName?.replace(/^Dr\.\s*/i, '') || 'Akhilesh Sharma'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Today's OPD clinic queue is protected with automatic routine breaks and emergency OT delay re-sequencing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-2 rounded-2xl bg-brand-teal px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span>Blessy Voice Actions</span>
          </button>
        </div>
      </div>

      {/* Doctor Analytics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Today's Patients</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{analytics?.todayAppointments ?? 2}</p>
          <span className="text-[10px] text-brand-tealLight font-semibold">Scheduled in OPD</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Utilization Rate</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{analytics?.utilizationRate ?? 88}%</p>
          <span className="text-[10px] text-slate-500">Buffer time protected</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Peak Consultation Hours</span>
          <p className="text-sm font-bold text-white truncate mt-1">{analytics?.peakHours ?? '10:30 AM – 01:00 PM'}</p>
          <span className="text-[10px] text-slate-500">High outpatient load</span>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Waiting Time</span>
          <p className="text-2xl font-bold text-sky-400 font-mono mt-1">{analytics?.averageWaitTime ?? '8 mins'}</p>
          <span className="text-[10px] text-slate-500">Optimal patient throughput</span>
        </div>
      </div>

      {/* Doctor & Clinic Console */}
      {doctors.length > 0 ? (
        <DoctorAdminConsole doctors={doctors} />
      ) : (
        <div className="p-8 text-center text-xs text-slate-400">Loading clinical calendar engine...</div>
      )}
    </div>
  );
}
