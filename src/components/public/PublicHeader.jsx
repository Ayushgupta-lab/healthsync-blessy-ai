import React from 'react';
import { Stethoscope, Sparkles, User, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function PublicHeader({ onOpenVoice }) {
  const { openAuth } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-dark/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 border border-brand-teal/30 text-brand-teal shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-white sm:text-lg">HealthSync</span>
              <span className="rounded bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-teal border border-brand-teal/30">
                Blessy AI
              </span>
            </div>
            <p className="text-xs text-slate-400">Intelligent Clinical Scheduling</p>
          </div>
        </div>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <a href="#features" className="hover:text-brand-tealLight transition-colors">Features</a>
          <a href="#doctors" className="hover:text-brand-tealLight transition-colors">Specialists</a>
          <a href="#about" className="hover:text-brand-tealLight transition-colors">About Blessy</a>
          <a href="#security" className="hover:text-brand-tealLight transition-colors">Security & Trust</a>
          <a href="#contact" className="hover:text-brand-tealLight transition-colors">Contact</a>
        </nav>

        {/* Auth CTA Actions */}
        <div className="flex items-center gap-2.5">
          {/* Blessy Voice Shortcut */}
          <button
            onClick={onOpenVoice}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-brand-surfaceElevated px-3 py-1.5 text-xs font-medium text-brand-tealLight border border-brand-teal/40 hover:border-brand-teal transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-teal animate-pulse" />
            <span>Voice AI</span>
          </button>

          <button
            onClick={() => openAuth('signin')}
            className="rounded-xl border border-brand-border bg-brand-surface px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:border-brand-borderActive hover:text-white transition-all cursor-pointer"
          >
            Sign In
          </button>

          <button
            onClick={() => openAuth('signup')}
            className="flex items-center gap-1.5 rounded-xl bg-brand-teal px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-brand-tealLight transition-all cursor-pointer"
          >
            <span>Create Account</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
