import React, { useState, useRef, useEffect } from 'react';
import {
  Stethoscope, Sparkles, Volume2, VolumeX, User, LogOut,
  Settings, ChevronDown, Check, Sun, Moon, Laptop, Brain
} from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { useTheme } from '../../services/themeContext.jsx';
import NotificationDropdown from '../common/NotificationDropdown.jsx';
import DebouncedSearchBar from '../common/DebouncedSearchBar.jsx';

export default function AppHeader({ onOpenVoice, soundEnabled, onToggleSound, onOpenSettings, onOpenML }) {
  const { user, role, logout, setIsOnboardingOpen } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  
  const menuRef = useRef(null);
  const themeRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeMenuOpen(false);
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

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4 text-amber-500" />;
    if (theme === 'dark') return <Moon className="h-4 w-4 text-teal-400" />;
    return <Laptop className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-brand-border bg-white/90 dark:bg-brand-dark/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        
        {/* Brand Logo & Role Pill */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-brand-teal shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">HealthSync</span>
              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:text-brand-tealLight border border-teal-500/30">
                {getRoleLabel()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Verified Clinical Scheduling</p>
          </div>
        </div>

        {/* Debounced Search (Middle) */}
        <div className="hidden md:block">
          <DebouncedSearchBar />
        </div>

        {/* Actions Dock */}
        <div className="flex items-center gap-2 sm:gap-2.5">

          {/* AI Brain & Machine Learning Insights */}
          <button
            onClick={onOpenML}
            title="Blessy Continuous Machine Learning Insights"
            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer shadow-sm"
          >
            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="hidden lg:inline text-[11px]">AI Learning</span>
          </button>

          {/* Theme Selector Dropdown (Light / Dark / Laptop Theme) */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              title={`Active Theme: ${theme.toUpperCase()} (Click to change)`}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-brand-border bg-slate-50 dark:bg-brand-surface text-slate-700 dark:text-slate-300 hover:border-teal-500/50 transition-all cursor-pointer shadow-sm"
            >
              {getThemeIcon()}
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-1.5 shadow-2xl z-50 animate-fadeIn text-xs text-slate-700 dark:text-slate-300">
                <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-brand-border/60 mb-1">
                  Appearance & Theme
                </div>
                
                <button
                  onClick={() => { setTheme('light'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-brand-surfaceElevated text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>White / Light</span>
                  </div>
                  {theme === 'light' && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                </button>

                <button
                  onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-brand-surfaceElevated text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-teal-500" />
                    <span>Dark Mode</span>
                  </div>
                  {theme === 'dark' && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
                </button>

                <button
                  onClick={() => { setTheme('system'); setThemeMenuOpen(false); }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-brand-surfaceElevated text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Laptop className="h-4 w-4 text-blue-500" />
                    <span>Laptop Theme (Auto)</span>
                  </div>
                  {theme === 'system' && <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                </button>
              </div>
            )}
          </div>

          {/* Notification Dropdown */}
          <NotificationDropdown />

          {/* Blessy Voice Action */}
          <button
            onClick={onOpenVoice}
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500/20 to-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-brand-tealLight border border-teal-500/40 hover:border-teal-500 hover:bg-teal-500/25 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-teal-600 dark:text-brand-tealLight animate-pulse" />
            <span className="hidden sm:inline">Blessy AI</span>
            <span className="rounded-full bg-emerald-500 h-1.5 w-1.5 animate-ping"></span>
          </button>

          {/* Sound Chimes */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute chimes" : "Enable chimes"}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-brand-border bg-slate-50 dark:bg-brand-surface text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-teal-600 dark:text-brand-teal" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* User Profile Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-brand-border bg-slate-50 dark:bg-brand-surface p-1.5 sm:px-2.5 text-xs font-semibold text-slate-800 dark:text-white hover:border-teal-500/50 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-500/20 text-teal-700 dark:text-brand-teal font-bold text-xs">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{user?.fullName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-brand-border bg-white dark:bg-brand-surface p-2 shadow-2xl z-50 animate-fadeIn text-xs text-slate-800 dark:text-white">
                <div className="p-2 border-b border-slate-100 dark:border-brand-border/60">
                  <p className="font-bold truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || user?.phone}</p>
                  <span className="inline-block mt-1 rounded bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-teal-700 dark:text-brand-teal">
                    {user?.role}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => { setProfileMenuOpen(false); onOpenSettings(); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-teal-600 dark:text-brand-teal" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); setIsOnboardingOpen(true); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <User className="h-4 w-4 text-teal-600 dark:text-brand-teal" />
                    <span>Role Onboarding</span>
                  </button>

                  <button
                    onClick={() => { setProfileMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 rounded-lg p-2 text-rose-600 dark:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer mt-1 border-t border-slate-100 dark:border-brand-border/40"
                  >
                    <LogOut className="h-4 w-4 text-rose-500 dark:text-rose-400" />
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
