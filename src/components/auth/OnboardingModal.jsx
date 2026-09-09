import React, { useState } from 'react';
import { User, Shield, HeartPulse, Stethoscope, Phone, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../services/authContext.jsx';

export default function OnboardingModal({ isOpen, onClose }) {
  const { user, profile, updateProfile, role } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patient profile state
  const [age, setAge] = useState(profile?.age || 28);
  const [gender, setGender] = useState(profile?.gender || 'Female');
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || 'O+');
  const [emergencyContactName, setEmergencyContactName] = useState(profile?.emergencyContact?.name || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile?.emergencyContact?.phone || '');
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'English');
  const [allergies, setAllergies] = useState(profile?.healthcarePreferences?.allergies?.join(', ') || 'None');

  // Doctor profile state
  const [specialty, setSpecialty] = useState(profile?.specialty || 'General Medicine & Cardiology');
  const [qualification, setQualification] = useState(profile?.qualification || 'MBBS, MD');
  const [experience, setExperience] = useState(profile?.experience || '10+ years');
  const [consultationFee, setConsultationFee] = useState(profile?.consultationFee || '₹800');
  const [room, setRoom] = useState(profile?.clinicInfo?.room || 'Suite 101 - Main Clinical Wing');

  // PA profile state
  const [clinic, setClinic] = useState(profile?.clinic || 'Apex Heart Center - OPD Desk A');
  const [assignedDoctor, setAssignedDoctor] = useState(profile?.assignedDoctor || 'Dr. Akhilesh Sharma, MD');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let updatedPayload = {};
    if (role === 'patient') {
      updatedPayload = {
        age: parseInt(age, 10) || 28,
        gender,
        bloodGroup,
        preferredLanguage,
        emergencyContact: {
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relation: "Family/Emergency"
        },
        healthcarePreferences: {
          allergies: allergies.split(',').map(s => s.trim()).filter(Boolean),
          autoReminders: true
        }
      };
    } else if (role === 'doctor') {
      updatedPayload = {
        specialty,
        qualification,
        experience,
        consultationFee,
        clinicInfo: {
          hospital: "HealthSync Apex Institute",
          room,
          address: "Sector 62, Cyber City"
        }
      };
    } else if (role === 'pa') {
      updatedPayload = {
        clinic,
        assignedDoctor
      };
    }

    try {
      await updateProfile(updatedPayload);
      onClose();
    } catch (err) {
      console.error("Onboarding submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Mark onboarded with defaults
    try {
      await updateProfile({ isOnboarded: true });
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-brand-dark/85 animate-fadeIn">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-brand-border bg-brand-surface p-6 sm:p-8 shadow-2xl">
        
        {/* Skip button at top right */}
        <button
          onClick={handleSkip}
          className="absolute top-5 right-5 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Skip for now</span>
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-teal/20 text-brand-teal border border-brand-teal/30 shadow-inner">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
            <p className="text-xs text-slate-400">
              Welcome, <strong className="text-slate-200">{user?.fullName}</strong>! Help us personalize your clinical workspace.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PATIENT ONBOARDING FORM */}
          {role === 'patient' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Blood Group</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g. John Doe (Spouse)"
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Emergency Phone</label>
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Language</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Hinglish">Hinglish / Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Allergies / Special Notes</label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Pollen"
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* DOCTOR ONBOARDING FORM */}
          {role === 'doctor' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Medical Specialty</label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Years of Experience</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Consultation Fee</label>
                  <input
                    type="text"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Clinic Room Number</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* PA ONBOARDING FORM */}
          {role === 'pa' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Clinic Wing</label>
                <input
                  type="text"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Specialist Doctor</label>
                <input
                  type="text"
                  value={assignedDoctor}
                  onChange={(e) => setAssignedDoctor(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-brand-dark px-3 py-2 text-xs text-white"
                  required
                />
              </div>
            </>
          )}

          {/* Action CTAs */}
          <div className="flex items-center justify-between pt-4 border-t border-brand-border/60">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Finish Later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-brand-teal px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-tealLight transition-all cursor-pointer"
            >
              <span>Save & Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
