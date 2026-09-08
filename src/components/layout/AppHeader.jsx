import React, { useState, useRef, useEffect } from 'react';
import { Stethoscope, Sparkles, Volume2, VolumeX, User, LogOut, Settings, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import NotificationDropdown from '../common/NotificationDropdown.jsx';
import DebouncedSearchBar from '../common/DebouncedSearchBar.jsx';

export default function AppHeader({ onOpenVoice, soundEnabled, onToggleSound, onOpenSettings }) {
  const { user, role, logout, setIsOnboardingOpen } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = () => {
    if (role === 'patient') return 'Patient Portal';
    if (role === 'doctor') return 'Doctor Portal';
    if (role === 'pa') return 'Clinic PA Operations';
    if (role === 'admin') return 'System Administrator';
    return 'Authenticated Portal';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-dark/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        
        {/* Brand Logo & Role Pill */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/15 border border-brand-teal/30 text-brand-teal shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white">HealthSync</span>
              <span className="rounded-full bg-brand-teal/20 px-2 py-0.5 text-[10px] font-bold text-brand-tealLight border border-brand-teal/30">
                {getRoleLabel()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Verified Clinical Scheduling</p>
          </div>
        </div>

        {/* Debounced Search (Middle) */}
        <div className="hidden md:block">
          <DebouncedSearchBar />
        </div>

        {/* Actions Dock */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* Blessy Voice Action */}
          <button
            onClick={onOpenVoice}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-teal/20 to-teal-500/10 px-3 py-1.5 text-xs font-semibold text-brand-tealLight border border-brand-teal/40 hover:border-brand-teal hover:bg-brand-teal/25 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-brand-tealLight animate-pulse" />
            <span className="hidden sm:inline">Blessy AI</span>
            <span className="rounded-full bg-brand-emerald h-1.5 w-1.5 animate-ping"></span>
          </button>

          {/* Sound Chimes */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute chimes" : "Enable chimes"}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-brand-teal" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-surface p-1.5 sm:px-2.5 text-xs font-semibold text-white hover:border-brand-teal/50 transition-all cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-teal/20 text-brand-teal font-bold text-xs">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{user?.fullName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-brand-border bg-brand-surface p-2 shadow-2xl z-50 animate-fadeIn text-xs">
                <div className="p-2 border-b border-brand-border/60">
                  <p className="font-bold text-white truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.phone}</p>
                  <span className="inline-block mt-1 rounded bg-brand-teal/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-teal">
                    {user?.role}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => { setProfileMenuOpen(false); onOpenSettings(); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-slate-300 hover:bg-brand-teal/10 hover:text-white transition-all cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-brand-teal" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); setIsOnboardingOpen(true); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-slate-300 hover:bg-brand-teal/10 hover:text-white transition-all cursor-pointer"
                  >
                    <User className="h-4 w-4 text-brand-teal" />
                    <span>Role Onboarding</span>
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer mt-1 border-t border-brand-border/40"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
