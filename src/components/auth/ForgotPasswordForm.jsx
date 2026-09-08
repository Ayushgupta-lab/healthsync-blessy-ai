import React, { useState } from 'react';
import { Mail, ArrowRight, AlertCircle, Loader2, KeyRound, Info } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function ForgotPasswordForm({ onSwitchTab }) {
  const { requestPasswordReset } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your registered email or phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(identifier.trim());
      // The auth context sets resetFlowData and switches to 'reset' tab automatically
    } catch (err) {
      setError(err.message || 'Could not locate an account with these credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal mb-3">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Reset your password</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your registered email address or phone number. We will generate a secure reset verification code.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Development Transparency Banner */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
        <Info className="h-4 w-4 shrink-0 text-sky-400 mt-0.5" />
        <span>
          <strong>Zero-Fake Messaging:</strong> In development mode, the system safely generates a one-time verification code on screen without pretending external SMTP gateways were reached.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Registered Email or Phone
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="patient@healthsync.io or +1 (555) 019-2834"
              className="w-full rounded-xl border border-brand-border bg-brand-surface pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal py-3 px-4 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight focus:outline-none focus:ring-2 focus:ring-brand-teal/50 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Account...</span>
            </>
          ) : (
            <>
              <span>Send Verification Code</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-brand-border/60 text-center">
        <p className="text-xs text-slate-400">
          Remembered your password?{' '}
          <button
            onClick={() => onSwitchTab('signin')}
            className="font-bold text-brand-tealLight hover:underline cursor-pointer"
          >
            Back to Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
