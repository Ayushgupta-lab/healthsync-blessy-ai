import React from 'react';
import { X, Sparkles, Shield, Stethoscope, Lock, HeartPulse, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import SignInForm from './SignInForm.jsx';
import SignUpForm from './SignUpForm.jsx';
import ForgotPasswordForm from './ForgotPasswordForm.jsx';
import ResetPasswordForm from './ResetPasswordForm.jsx';

export default function AuthModal({ isOpen, onClose, initialTab = 'signin' }) {
  const { authModalTab, setAuthModalTab } = useAuth();
  const currentTab = authModalTab || initialTab;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-brand-dark/85 animate-fadeIn">
      {/* Container Box */}
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-2xl flex flex-col md:flex-row min-h-[580px]">

        {/* Close Button (Top Right) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-brand-surfaceElevated border border-brand-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* LEFT PANEL: Healthcare AI Branding & Ambient Visual (Desktop) */}
        <div className="relative hidden md:flex md:w-5/12 flex-col justify-between p-8 bg-gradient-to-br from-brand-surfaceElevated via-brand-dark to-brand-teal/20 border-r border-brand-border overflow-hidden">
          {/* Subtle Ambient Glow Background Orbs */}
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-brand-teal/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

          {/* Top Branding */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal text-white shadow-lg shadow-brand-teal/30">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white">HealthSync</span>
                <span className="ml-2 rounded-md bg-brand-teal/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-tealLight border border-brand-teal/30">
                  Blessy AI
                </span>
                <p className="text-[11px] text-slate-400">Clinical Scheduling SaaS</p>
              </div>
            </div>

            {/* Central Animated AI Orb Card */}
            <div className="mt-10 rounded-2xl border border-brand-teal/30 bg-brand-dark/60 p-5 backdrop-blur-sm relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal/25 text-brand-teal ring-4 ring-brand-teal/20">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Blessy Front-Desk AI</h4>
                  <p className="text-[10px] text-brand-tealLight">Bilingual Clinical Coordinator</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "Namaste! OPD consultations are scheduled with strict respect for doctor surgical hours and patient vital urgency."
              </p>
            </div>
          </div>

          {/* Clinical Trust Badges */}
          <div className="relative z-10 space-y-3 pt-6 border-t border-brand-border/60">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Shield className="h-4 w-4 text-brand-teal shrink-0" />
              <span>Zero Plaintext Passwords (scrypt Encrypted)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <HeartPulse className="h-4 w-4 text-brand-teal shrink-0" />
              <span>Dynamic Doctor Rest & Surgery Protection</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0" />
              <span>Verified Digital Clinic Passes (#BSY)</span>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="relative z-10 pt-4 text-[10px] text-slate-500 font-mono">
            HealthSync OS v2.4 • Production Cloud Security
          </div>
        </div>

        {/* RIGHT PANEL: Form Container */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center overflow-y-auto max-h-[90vh] md:max-h-none">
          {currentTab === 'signin' && (
            <SignInForm
              onSwitchTab={(tab) => setAuthModalTab(tab)}
              onSuccess={onClose}
            />
          )}

          {currentTab === 'signup' && (
            <SignUpForm
              onSwitchTab={(tab) => setAuthModalTab(tab)}
              onSuccess={onClose}
            />
          )}

          {currentTab === 'forgot' && (
            <ForgotPasswordForm
              onSwitchTab={(tab) => setAuthModalTab(tab)}
            />
          )}

          {currentTab === 'reset' && (
            <ResetPasswordForm
              onSwitchTab={(tab) => setAuthModalTab(tab)}
            />
          )}
        </div>

      </div>
    </div>
  );
}
