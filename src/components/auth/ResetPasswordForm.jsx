import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff, CheckCircle2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function ResetPasswordForm({ onSwitchTab }) {
  const { resetPassword, resetFlowData } = useAuth();
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill devVerificationCode if available from the backend response
  useEffect(() => {
    if (resetFlowData && resetFlowData.devVerificationCode) {
      setResetToken(resetFlowData.devVerificationCode);
    }
  }, [resetFlowData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetToken.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword({
        resetToken: resetToken.trim(),
        newPassword,
        confirmPassword
      });
      setSuccessMsg(res.message || 'Your password has been changed successfully!');
      setTimeout(() => {
        onSwitchTab('signin');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check the code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">Set New Password</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter the verification code and your new secure clinical password.
        </p>
      </div>

      {/* Dev notification badge */}
      {resetFlowData?.devNotice && (
        <div className="mb-4 rounded-xl border border-brand-teal/40 bg-brand-teal/15 p-3 text-xs text-brand-tealLight">
          <p className="font-semibold">{resetFlowData.devNotice}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Verification Code */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            6-Digit Verification Code
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <KeyRound className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="e.g. 748291"
              maxLength={10}
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal tracking-wider"
              required
            />
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!successMsg}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal py-3 px-4 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight focus:outline-none focus:ring-2 focus:ring-brand-teal/50 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <>
              <span>Confirm Password Change</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 pt-3 border-t border-brand-border/60 text-center">
        <p className="text-xs text-slate-400">
          Changed your mind?{' '}
          <button
            onClick={() => onSwitchTab('signin')}
            className="font-bold text-brand-tealLight hover:underline cursor-pointer"
          >
            Return to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
