import React, { useState } from 'react';
import { AuthProvider, useAuth } from './services/authContext.jsx';
import LandingPage from './components/public/LandingPage.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import PatientDashboard from './components/dashboard/PatientDashboard.jsx';
import DoctorDashboard from './components/dashboard/DoctorDashboard.jsx';
import PADashboard from './components/dashboard/PADashboard.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import OnboardingModal from './components/auth/OnboardingModal.jsx';
import AccountSettingsModal from './components/dashboard/AccountSettingsModal.jsx';
import VoiceOverlayModal from './components/voice/VoiceOverlayModal.jsx';
import { Shield, Sparkles, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, role, isAuthenticated, isLoading, authModalOpen, closeAuth, isOnboardingOpen, setIsOnboardingOpen } = useAuth();
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Loading State (Verifying session token)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-slate-100">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/20 text-brand-teal border border-brand-teal/40 shadow-xl mb-4">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-white">HealthSync Medical-SaaS</h2>
        <p className="text-xs text-slate-400 mt-1">Synchronizing clinical authentication session...</p>
      </div>
    );
  }

  // 2. Unauthenticated State -> Render Public Landing Page
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage onOpenVoice={() => setIsVoiceOpen(true)} />

        {/* Auth Modal (Sign In, Sign Up, Forgot Password, Reset Password) */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={closeAuth}
        />

        {/* Blessy Voice Overlay */}
        <VoiceOverlayModal
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          user={user}
        />
      </>
    );
  }

  // 3. Authenticated State -> Render Role-Based Protected Dashboard
  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col selection:bg-brand-teal selection:text-white">
      {/* Top Application Header */}
      <AppHeader
        onOpenVoice={() => setIsVoiceOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Verified Clinical Scheduling Banner */}
      <div className="border-b border-brand-border/60 bg-brand-surface/30 px-4 py-2 text-center text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5 text-brand-teal" />
          <span>
            <strong>HealthSync Clinical OS</strong>: Persistent relational database active. Doctor routine breaks, surgeries & sleep intervals dynamically protected.
          </span>
        </div>
      </div>

      {/* Main Role-Based Dashboard View */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {role === 'patient' && (
          <PatientDashboard onOpenVoice={() => setIsVoiceOpen(true)} />
        )}

        {role === 'doctor' && (
          <DoctorDashboard onOpenVoice={() => setIsVoiceOpen(true)} />
        )}

        {(role === 'pa' || role === 'admin') && (
          <PADashboard onOpenVoice={() => setIsVoiceOpen(true)} />
        )}
      </main>

      {/* Floating Bottom-Right Voice Assistant Button */}
      <button
        onClick={() => setIsVoiceOpen(true)}
        title="Open Blessy Voice AI (Say 'Hello Blessy')"
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2.5 rounded-2xl bg-brand-surfaceElevated px-4 py-3 text-xs font-bold text-white shadow-2xl border border-brand-teal/40 hover:border-brand-teal hover:scale-105 transition-all group cursor-pointer"
      >
        <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-brand-teal/20 text-brand-teal ring-2 ring-brand-teal/30">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[11px] text-slate-400 font-normal leading-none">Voice Assistant</p>
          <p className="text-xs font-bold text-brand-tealLight mt-0.5 leading-none">Talk to Blessy</p>
        </div>
        <span className="h-2 w-2 rounded-full bg-brand-emerald animate-ping"></span>
      </button>

      {/* Modals */}
      <VoiceOverlayModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        user={user}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <AccountSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuth}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
