import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Check, X, Shield, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function SignUpForm({ onSwitchTab, onSuccess }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password metrics
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  const strengthScore = [
    checks.length,
    checks.hasUpper && checks.hasLower,
    checks.hasNumber,
    checks.hasSpecial
  ].filter(Boolean).length;

  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-teal-400', 'bg-emerald-500'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full legal name.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (phone.replace(/[^0-9]/g, '').length < 8) {
      setError('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (strengthScore < 3) {
      setError('Please strengthen your password before continuing.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
        role
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">Create your Blessy account</h2>
        <p className="mt-1 text-xs text-slate-400">
          Your healthcare journey, organized in one place with AI-driven clinical care.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Role Selector Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Your Role
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                role === 'patient'
                  ? 'border-brand-teal bg-brand-teal/15 text-white shadow-sm'
                  : 'border-brand-border bg-brand-surface text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="block text-xs font-bold text-white">👤 Patient</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">Consultations & Care</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                role === 'doctor'
                  ? 'border-brand-teal bg-brand-teal/15 text-white shadow-sm'
                  : 'border-brand-border bg-brand-surface text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="block text-xs font-bold text-white">🩺 Doctor</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">Clinical Practice</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('pa')}
              className={`rounded-xl border p-2.5 text-left transition-all ${
                role === 'pa'
                  ? 'border-brand-teal bg-brand-teal/15 text-white shadow-sm'
                  : 'border-brand-border bg-brand-surface text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="block text-xs font-bold text-white">📋 Clinic PA</span>
              <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">Front-Desk Ops</span>
            </button>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Full Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              required
            />
          </div>
        </div>

        {/* Email & Phone Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                required
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters with upper, number, symbol"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
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

          {/* Password Strength Meter */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Security strength:</span>
                <span className="font-semibold text-slate-200">{strengthLabels[strengthScore]}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 h-1.5">
                {[0, 1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`rounded-full transition-all ${
                      step < strengthScore ? strengthColors[strengthScore] : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1">
                <span className={`flex items-center gap-1 ${checks.length ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {checks.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 8+ characters
                </span>
                <span className={`flex items-center gap-1 ${checks.hasUpper && checks.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {checks.hasUpper && checks.hasLower ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Upper & lower
                </span>
                <span className={`flex items-center gap-1 ${checks.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {checks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Number (0-9)
                </span>
                <span className={`flex items-center gap-1 ${checks.hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {checks.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Special (!@#$)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Confirm Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type password"
              className={`w-full rounded-xl border bg-brand-surface pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                confirmPassword && confirmPassword !== password
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-brand-border focus:border-brand-teal focus:ring-brand-teal'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal py-3 px-4 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight focus:outline-none focus:ring-2 focus:ring-brand-teal/50 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-5 pt-3 border-t border-brand-border/60 text-center">
        <p className="text-xs text-slate-400">
          Already have an account?{' '}
          <button
            onClick={() => onSwitchTab('signin')}
            className="font-bold text-brand-tealLight hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
