import React, { useState } from 'react';
import { X, User, Lock, Globe, Bell, Trash2, LogOut, Check, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';
import { apiService } from '../../services/apiService.js';

export default function AccountSettingsModal({ isOpen, onClose }) {
  const { user, profile, updateProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // profile | security | preferences | retention

  // Profile Form State
  const [name, setName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [age, setAge] = useState(profile?.age || '');
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || 'O+');
  const [language, setLanguage] = useState(profile?.preferredLanguage || 'English');

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateProfile({
        name,
        phone,
        age: parseInt(age, 10) || null,
        bloodGroup,
        preferredLanguage: language
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdMsg('');

    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      // In production, updating password directly
      await apiService.put('/api/profile', { newPassword });
      setPwdMsg('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdMsg(''), 3000);
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConversations = async () => {
    if (window.confirm("Are you sure you want to delete your stored Blessy conversation history? This cannot be undone.")) {
      try {
        await apiService.delete('/api/conversations');
        alert("Conversation history cleared.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-brand-dark/85 animate-fadeIn">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-2xl flex flex-col md:flex-row min-h-[480px]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-brand-surfaceElevated border border-brand-border text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Settings Left Navigation */}
        <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-brand-border/60 bg-brand-dark/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-teal/20 text-brand-teal border border-brand-teal/30 font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-white truncate">{user?.fullName}</h4>
                <p className="text-[10px] text-brand-teal uppercase font-semibold">{user?.role} Portal</p>
              </div>
            </div>

            <nav className="space-y-1 text-xs">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-all ${
                  activeTab === 'profile' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile Details</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-all ${
                  activeTab === 'security' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="h-4 w-4" />
                <span>Security & Password</span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-all ${
                  activeTab === 'preferences' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Language & Voice</span>
              </button>

              <button
                onClick={() => setActiveTab('retention')}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition-all ${
                  activeTab === 'retention' ? 'bg-brand-teal text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Data Retention</span>
              </button>
            </nav>
          </div>

          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full mt-6 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of Account</span>
          </button>
        </div>

        {/* Settings Right Content */}
        <div className="w-full md:w-7/12 p-6 overflow-y-auto">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <h3 className="text-base font-bold text-white mb-1">Personal Profile</h3>
              <p className="text-xs text-slate-400 mb-4">Manage your contact information and clinical preferences.</p>

              {saveSuccess && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
                  <Check className="h-4 w-4" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white font-mono"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-2 text-xs font-bold text-white hover:bg-brand-tealLight transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div>
              <h3 className="text-base font-bold text-white mb-1">Security & Credentials</h3>
              <p className="text-xs text-slate-400 mb-4">Change your account password. All passwords are salted with scrypt encryption.</p>

              {pwdMsg && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300">
                  <Check className="h-4 w-4" />
                  <span>{pwdMsg}</span>
                </div>
              )}

              {pwdError && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4" />
                  <span>{pwdError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-teal px-4 py-2 text-xs font-bold text-white hover:bg-brand-tealLight transition-all cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Update Password</span>
                </button>
              </form>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div>
              <h3 className="text-base font-bold text-white mb-1">Language & Voice Assistant</h3>
              <p className="text-xs text-slate-400 mb-4">Set your dialect preferences for Blessy AI.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Preferred Dialect</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  >
                    <option value="English">English (Clinical standard)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Hinglish">Hinglish / Auto (Conversational)</option>
                  </select>
                </div>

                <div className="rounded-xl border border-brand-border bg-brand-dark/40 p-3 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-1">Blessy Speech Synthesis</p>
                  <p className="text-slate-400 text-[11px]">Bilingual Indian English / Hindi voice synthesis with natural bedside empathy enabled.</p>
                </div>
              </div>
            </div>
          )}

          {/* RETENTION TAB */}
          {activeTab === 'retention' && (
            <div>
              <h3 className="text-base font-bold text-white mb-1">Data Retention & Privacy</h3>
              <p className="text-xs text-slate-400 mb-4">Review clinical storage compliance and manage conversational history.</p>

              <div className="rounded-xl border border-brand-border bg-brand-dark/40 p-3.5 text-xs space-y-2 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Data Retention Policy:</span>
                  <span className="font-mono text-brand-tealLight font-bold">90 Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Trail Logging:</span>
                  <span className="text-emerald-400 font-semibold">Active (Tamper-Resistant)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage Engine:</span>
                  <span className="font-mono text-slate-400">Atomic HealthSync DB</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-brand-border/60">
                <button
                  type="button"
                  onClick={handleClearConversations}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge Stored Blessy Conversation History</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
