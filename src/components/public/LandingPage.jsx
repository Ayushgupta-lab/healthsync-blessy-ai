import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Stethoscope, Clock, Calendar, HeartPulse, QrCode, ArrowRight, Star, CheckCircle, Award, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { apiService } from '../../services/apiService.js';
import PublicHeader from './PublicHeader.jsx';

export default function LandingPage({ onOpenVoice }) {
  const { openAuth } = useAuth();
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await apiService.get('/api/doctors');
        if (res && res.doctors) {
          setDoctors(res.doctors);
        }
      } catch (e) {
        console.warn("Error fetching doctors for landing page:", e);
      }
    }
    loadDoctors();
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col selection:bg-brand-teal selection:text-white">
      {/* Public Header */}
      <PublicHeader onOpenVoice={onOpenVoice} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Subtle Ambient Background Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 md:h-[500px] md:w-[650px] rounded-full bg-brand-teal/15 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3.5 py-1.5 text-xs font-semibold text-brand-tealLight mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-brand-teal" />
            <span>AI-Powered Medical SaaS & Clinical Front-Desk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Intelligent Clinical Scheduling & <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-brand-teal to-emerald-400">
              Voice AI Front-Desk
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed">
            Your healthcare journey, organized in one place. HealthSync unites doctors, patients, and clinic PAs with automated calendar protection, surgical conflict resolution, and bilingual voice scheduling.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={() => openAuth('signup')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-brand-teal px-6 py-3.5 text-xs font-bold text-white shadow-xl hover:bg-brand-tealLight transition-all cursor-pointer"
            >
              <span>Create Free Patient Account</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => openAuth('signin')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-brand-border bg-brand-surface px-6 py-3.5 text-xs font-bold text-slate-200 hover:border-brand-borderActive hover:text-white transition-all cursor-pointer"
            >
              <span>Sign In to Existing Portal</span>
            </button>

            <button
              onClick={onOpenVoice}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-brand-teal/40 bg-brand-teal/10 px-5 py-3.5 text-xs font-bold text-brand-tealLight hover:bg-brand-teal/20 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4 animate-pulse text-brand-teal" />
              <span>Talk to Blessy Voice</span>
            </button>
          </div>

          {/* Key Metric Seals */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-brand-border/60 pt-8 text-left">
            <div className="rounded-2xl border border-brand-border/80 bg-brand-surface/60 p-4">
              <span className="block text-2xl font-bold text-white font-mono">10,000+</span>
              <span className="text-xs text-slate-400">Consultations Scheduled</span>
            </div>
            <div className="rounded-2xl border border-brand-border/80 bg-brand-surface/60 p-4">
              <span className="block text-2xl font-bold text-brand-tealLight font-mono">100%</span>
              <span className="text-xs text-slate-400">Doctor Rest Protection</span>
            </div>
            <div className="rounded-2xl border border-brand-border/80 bg-brand-surface/60 p-4">
              <span className="block text-2xl font-bold text-emerald-400 font-mono">0 Plaintext</span>
              <span className="text-xs text-slate-400">scrypt Salted Security</span>
            </div>
            <div className="rounded-2xl border border-brand-border/80 bg-brand-surface/60 p-4">
              <span className="block text-2xl font-bold text-sky-400 font-mono">Real-Time</span>
              <span className="text-xs text-slate-400">Digital Verification Passes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-16 border-t border-brand-border/60 bg-brand-surface/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">Enterprise Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Built for Modern Clinical Realities
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Say goodbye to double-bookings, burnt-out doctors, and lost medical paperwork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 hover:border-brand-teal/50 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Doctor Rest & Surgery Protection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically blocks appointments during night sleep, breakfast, lunch, and tea breaks. Emergency OT delays dynamically shift downstream patients with zero manual overhead.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 hover:border-brand-teal/50 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Empathetic Voice Assistant</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Blessy speaks natural Hinglish, Hindi, and English. She checks real doctor availability, answers appointment queries, and flags emergency red flags straight to emergency care.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 hover:border-brand-teal/50 transition-all">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal mb-4">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Instant Digital Entry Passes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every confirmed booking generates a tamper-evident digital clinic pass with unique BSY tracking numbers and gate codes for swift OPD check-in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Doctors Directory Section */}
      <section id="doctors" className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 pb-4 border-b border-brand-border">
            <div>
              <span className="text-xs font-bold text-brand-teal uppercase tracking-wider">Clinical Faculty</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Consult With Our Leading Specialists
              </h2>
            </div>
            <button
              onClick={() => openAuth('signin')}
              className="mt-3 sm:mt-0 text-xs font-semibold text-brand-tealLight hover:underline"
            >
              View Full Clinical Directory &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="rounded-2xl border border-brand-border bg-brand-surface p-5 flex flex-col justify-between hover:border-brand-teal/50 transition-all"
              >
                <div>
                  <div className="relative mb-3 flex justify-center">
                    <img
                      src={doc.photoUrl}
                      alt={doc.name}
                      className="h-24 w-24 rounded-2xl object-cover border-2 border-brand-teal/30 shadow-md"
                    />
                    <span className="absolute bottom-0 right-1/3 rounded-full bg-emerald-500 h-3 w-3 border-2 border-brand-surface ring-2 ring-emerald-500/20" />
                  </div>

                  <h3 className="text-sm font-bold text-white text-center">{doc.name}</h3>
                  <p className="text-[11px] font-medium text-brand-teal text-center mt-0.5">{doc.specialty}</p>

                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="h-3 w-3 fill-current" />
                      {doc.rating}
                    </span>
                    <span>•</span>
                    <span>{doc.experience}</span>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {doc.bio}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">Consultation</span>
                    <p className="text-xs font-bold text-white">{doc.consultationFee}</p>
                  </div>
                  <button
                    onClick={() => openAuth('signup')}
                    className="rounded-xl bg-brand-teal/20 px-3 py-1.5 text-xs font-semibold text-brand-tealLight border border-brand-teal/40 hover:bg-brand-teal hover:text-white transition-all cursor-pointer"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & HIPAA Compliance Section */}
      <section id="security" className="py-16 border-t border-brand-border/60 bg-brand-surface/20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-brand-border bg-brand-surface p-8 sm:p-12 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 text-brand-teal font-semibold text-xs mb-2">
                <Shield className="h-4 w-4" />
                <span>HEALTHCARE DATA INTEGRITY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Enterprise-Grade Privacy & Security
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
                HealthSync adheres strictly to clinical security standards. Passwords are encrypted with Node.js scrypt with individual 16-byte random salts. Role-Based Access Control (RBAC) ensures patients never access doctor admin endpoints or other patients' records.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-teal" />
                  <span>Persistent Relational Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-teal" />
                  <span>Zero Plaintext Stored Credentials</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-teal" />
                  <span>Strict RBAC Route Protection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand-teal" />
                  <span>Tamper-Resistant Audit Trail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Clinic Info */}
      <section id="contact" className="py-16 border-t border-brand-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MapPin className="h-4 w-4 text-brand-teal" />
                <span>Central Clinical Campus</span>
              </div>
              <p>HealthSync Apex Heart & Diagnostic Institute</p>
              <p>Sector 62, Cyber City, Gurugram / New Delhi NCR</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Phone className="h-4 w-4 text-brand-teal" />
                <span>Emergency OPD Helpline</span>
              </div>
              <p>24/7 Triage Helpline: +91 11 4099 2800</p>
              <p>Blessy Voice Support: Toll-Free 1800-HEALTH-AI</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Mail className="h-4 w-4 text-brand-teal" />
                <span>Clinical Administration</span>
              </div>
              <p>Direct Inquiries: clinic.desk@healthsync.io</p>
              <p>Chief Medical Officer: dr.sharma@healthsync.io</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border py-6 bg-brand-dark">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 HealthSync Medical AI Systems. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#security" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#about" className="hover:text-slate-300">Terms of Care</a>
            <a href="#security" className="hover:text-slate-300">Audit Compliance</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
