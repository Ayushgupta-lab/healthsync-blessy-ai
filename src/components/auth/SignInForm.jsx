import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function SignInForm({ onSwitchTab, onSuccess }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ identifier, password, rememberMe });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (role) => {
    setError('');
    if (role === 'patient') {
      setIdentifier('patient@healthsync.io');
      setPassword('Patient@123');
    } else if (role === 'doctor') {
      setIdentifier('doctor.sharma@healthsync.io');
      setPassword('Doctor@123');
    } else if (role === 'pa') {
      setIdentifier('pa.sarah@healthsync.io');
      setPassword('Staff@123');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
        <p className="mt-1 text-xs text-slate-400">
          Sign in to access your consultations, medical records, and Blessy AI assistant.
        </p>
      </div>

      {/* Quick Demo Fill Pills */}
      <div className="mb-5 rounded-xl border border-brand-border bg-brand-surfaceElevated/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-brand-teal" />
            Quick Demo Login:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">1-click fill</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount('patient')}
            className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-medium text-slate-200 hover:border-brand-teal/50 hover:bg-brand-teal/10 hover:text-brand-tealLight transition-all text-center truncate"
          >
            👤 Patient
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('doctor')}
            className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-medium text-slate-200 hover:border-brand-teal/50 hover:bg-brand-teal/10 hover:text-brand-tealLight transition-all text-center truncate"
          >
            🩺 Doctor
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identifier Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Email Address or Phone Number
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com or +91 98765 43210"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-colors"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Password
            </label>
            <button
              type="button"
              onClick={() => onSwitchTab('forgot')}
              className="text-xs font-medium text-brand-tealLight hover:underline transition-all"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-brand-border bg-brand-surface text-brand-teal focus:ring-brand-teal"
            />
            <span className="text-xs text-slate-300">Keep me signed in for 30 days</span>
          </label>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal py-3 px-4 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight focus:outline-none focus:ring-2 focus:ring-brand-teal/50 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Blessy Health</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-6 pt-4 border-t border-brand-border/60 text-center">
        <p className="text-xs text-slate-400">
          Don't have an account?{' '}
          <button
            onClick={() => onSwitchTab('signup')}
            className="font-bold text-brand-tealLight hover:underline cursor-pointer"
          >
            Create one now
          </button>
        </p>
      </div>
    </div>
  );
}
