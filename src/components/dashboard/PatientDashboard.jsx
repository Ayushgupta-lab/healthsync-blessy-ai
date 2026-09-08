import React, { useState, useEffect } from 'react';
import { Calendar, Clock, QrCode, MapPin, Sparkles, AlertCircle, CheckCircle2, ChevronRight, RefreshCw, X, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { apiService } from '../../services/apiService.js';
import BookingWizard from '../wizard/BookingWizard.jsx';
import { formatTime12 } from '../../services/scheduleEngine.js';

export default function PatientDashboard({ onOpenVoice }) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [historyTab, setHistoryTab] = useState('upcoming'); // upcoming | completed | rescheduled | cancelled
  const [activePassApt, setActivePassApt] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('11:00');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [notification, setNotification] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const loadData = async () => {
    try {
      const [analyticsRes, aptsRes, docsRes] = await Promise.all([
        apiService.get('/api/analytics'),
        apiService.get('/api/appointments'),
        apiService.get('/api/doctors')
      ]);
      if (analyticsRes) setAnalytics(analyticsRes);
      if (aptsRes && aptsRes.appointments) setAppointments(aptsRes.appointments);
      if (docsRes && docsRes.doctors) setDoctors(docsRes.doctors);
    } catch (err) {
      console.warn("Failed to load patient dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBookingComplete = (apt) => {
    setNotification(`Appointment ${apt.id} booked with ${apt.doctorName}!`);
    setShowWizard(false);
    loadData();
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCancelAppointment = async (aptId) => {
    if (window.confirm(`Are you sure you want to cancel appointment #${aptId}?`)) {
      try {
        await apiService.put(`/api/appointments/${aptId}`, {
          status: 'cancelled',
          reason: 'Patient requested cancellation via portal'
        });
        setNotification(`Appointment #${aptId} was cancelled.`);
        loadData();
        setTimeout(() => setNotification(null), 4000);
      } catch (err) {
        alert(err.message || "Failed to cancel");
      }
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleApt || !rescheduleDate || !rescheduleTime) return;

    setIsSubmittingReschedule(true);
    try {
      await apiService.put(`/api/appointments/${rescheduleApt.id}`, {
        status: 'shifted',
        date: rescheduleDate,
        time: rescheduleTime,
        reason: `Rescheduled by patient to ${rescheduleDate} at ${rescheduleTime}`
      });
      setNotification(`Appointment #${rescheduleApt.id} rescheduled to ${rescheduleDate} at ${rescheduleTime}!`);
      setRescheduleApt(null);
      loadData();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(err.message || "Failed to reschedule");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Filter appointments for the history tabs
  const filteredAppointments = appointments.filter(a => {
    if (historyTab === 'upcoming') return a.status === 'confirmed' || a.status === 'shifted';
    if (historyTab === 'completed') return a.status === 'completed';
    if (historyTab === 'rescheduled') return a.status === 'shifted';
    if (historyTab === 'cancelled') return a.status === 'cancelled';
    return true;
  });

  const nextAppointment = appointments.find(a => a.status === 'confirmed' || a.status === 'shifted');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Personalized Patient Banner */}
      <div className="rounded-3xl border border-brand-border bg-gradient-to-r from-brand-surfaceElevated via-brand-surface to-brand-dark p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-teal/20 px-3 py-1 text-xs font-semibold text-brand-tealLight border border-brand-teal/30 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-brand-teal" />
            <span>Blessy AI Clinical Care</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Good morning, {user?.fullName || 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Your clinical consultations, health records, and AI triage assistant are synchronized in real-time.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl bg-brand-teal px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight transition-all cursor-pointer"
          >
            <span>{showWizard ? 'Hide Booking Wizard' : 'Book New Consultation'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenVoice}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl border border-brand-teal/40 bg-brand-teal/10 px-4 py-3 text-xs font-bold text-brand-tealLight hover:bg-brand-teal/20 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4 animate-pulse text-brand-teal" />
            <span>Ask Blessy</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="rounded-2xl border border-brand-teal/40 bg-brand-teal/15 p-4 text-xs font-semibold text-brand-tealLight shadow-md">
          {notification}
        </div>
      )}

      {/* Patient Operational Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Consultations</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-1">{analytics?.totalAppointments || appointments.length}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Persistent database records</span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upcoming Visits</span>
          <p className="text-2xl font-bold text-brand-teal font-mono mt-1">{analytics?.upcomingCount || (nextAppointment ? 1 : 0)}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Active digital passes</span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Primary Specialty</span>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate mt-1">{analytics?.topSpecialty || 'Cardiology'}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Frequent consultation track</span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed Reviews</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{analytics?.completedCount || 1}</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Documented visit history</span>
        </div>
      </div>

      {/* Next Appointment Hero Card */}
      {nextAppointment && (
        <div className="rounded-3xl border border-brand-teal/30 bg-gradient-to-r from-teal-500/10 via-white to-white dark:from-brand-teal/10 dark:via-brand-surface dark:to-brand-surface p-6 relative overflow-hidden shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300">
                  {nextAppointment.status}
                </span>
                <span className="font-mono text-xs font-bold text-brand-teal">#{nextAppointment.id}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{nextAppointment.doctorName}</h3>
              <p className="text-xs text-brand-teal font-medium">{nextAppointment.doctorSpecialty}</p>
              
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-brand-teal" />
                  <span>{nextAppointment.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-teal" />
                  <span>{formatTime12(nextAppointment.time)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-brand-teal" />
                  <span>{nextAppointment.room}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <button
                onClick={() => setActivePassApt(nextAppointment)}
                className="flex items-center gap-2 rounded-xl bg-brand-teal px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-tealLight transition-all cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>View Digital Pass</span>
              </button>
              <button
                onClick={() => {
                  setRescheduleApt(nextAppointment);
                  setRescheduleDate(nextAppointment.date);
                  setRescheduleTime(nextAppointment.time);
                }}
                className="text-xs font-semibold text-brand-teal hover:underline py-1"
              >
                Reschedule Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stepped Booking Wizard (collapsible / toggleable) */}
      {showWizard && (
        <div className="rounded-3xl border border-brand-teal/40 bg-white dark:bg-brand-surface p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-brand-border">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">4-Step Progressive Booking Wizard</h3>
            <button
              onClick={() => setShowWizard(false)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Close Wizard
            </button>
          </div>
          <BookingWizard
            doctors={doctors}
            onBookingComplete={handleBookingComplete}
          />
        </div>
      )}

      {/* Appointment History Tabs (Upcoming, Completed, Rescheduled, Cancelled) */}
      <div className="rounded-3xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-brand-border gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Consultation Records & History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">All historical clinical appointments stored in persistent database.</p>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-brand-dark p-1 border border-slate-200 dark:border-brand-border text-xs">
            <button
              onClick={() => setHistoryTab('upcoming')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                historyTab === 'upcoming' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setHistoryTab('completed')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                historyTab === 'completed' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setHistoryTab('rescheduled')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                historyTab === 'rescheduled' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Rescheduled
            </button>
            <button
              onClick={() => setHistoryTab('cancelled')}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                historyTab === 'cancelled' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredAppointments.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No appointments found in the <strong className="text-slate-700 dark:text-slate-400">{historyTab}</strong> archive.
            </p>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-brand-border bg-slate-50/70 dark:bg-brand-dark/50 p-4 hover:border-brand-teal/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-brand-teal">#{apt.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : apt.status === 'shifted'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                          : apt.status === 'completed'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{apt.doctorName}</h4>
                  <p className="text-xs text-brand-teal">{apt.doctorSpecialty}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    📅 {apt.date} at {formatTime12(apt.time)} • {apt.room}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivePassApt(apt)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-teal hover:text-brand-teal dark:hover:text-white transition-all cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5 text-brand-teal" />
                    <span>Pass</span>
                  </button>

                  {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                    <>
                      <button
                        onClick={() => {
                          setRescheduleApt(apt);
                          setRescheduleDate(apt.date);
                          setRescheduleTime(apt.time);
                        }}
                        className="rounded-xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-brand-teal hover:text-brand-teal dark:hover:text-white transition-all cursor-pointer"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Digital Pass Modal */}
      {activePassApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 dark:bg-brand-dark/85">
          <div className="relative w-full max-w-sm rounded-3xl border border-brand-teal/40 bg-white dark:bg-brand-surface p-6 text-center shadow-2xl">
            <button
              onClick={() => setActivePassApt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/20 text-brand-teal mb-3">
              <QrCode className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Digital Clinic Entry Pass</h4>
            <p className="text-xs text-brand-teal font-mono">#{activePassApt.id}</p>

            <div className="my-5 rounded-2xl border border-dashed border-brand-teal/40 bg-slate-50 dark:bg-brand-dark/70 p-4">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-xl bg-white p-2 border border-slate-200">
                <QrCode className="h-28 w-28 text-slate-900" />
              </div>
              <p className="mt-3 font-mono text-[11px] text-brand-teal font-bold">
                {activePassApt.digitalPass?.gateCode || 'GATE-NORTH-101'}
              </p>
              <p className="text-[10px] text-slate-500">Scan at Hospital OPD Kiosk</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 text-left border-t border-slate-200 dark:border-brand-border/60 pt-3">
              <p><strong>Patient:</strong> {activePassApt.patientName}</p>
              <p><strong>Specialist:</strong> {activePassApt.doctorName}</p>
              <p><strong>Slot:</strong> {activePassApt.date} at {formatTime12(activePassApt.time)}</p>
              <p><strong>Room:</strong> {activePassApt.room}</p>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 dark:bg-brand-dark/85">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-6 shadow-2xl">
            <button
              onClick={() => setRescheduleApt(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">Reschedule Consultation</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">#{rescheduleApt.id} with {rescheduleApt.doctorName}</p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Select New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-brand-border bg-slate-50 dark:bg-brand-dark px-3 py-2 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Select New Time Slot</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-brand-border bg-slate-50 dark:bg-brand-dark px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:30">05:30 PM</option>
                  <option value="18:30">06:30 PM</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-brand-border/60">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="rounded-xl border border-slate-200 dark:border-brand-border px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-brand-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="rounded-xl bg-brand-teal px-4 py-2 text-xs font-bold text-white hover:bg-brand-tealLight"
                >
                  {isSubmittingReschedule ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
