import React, { useState } from 'react';
import { CheckCircle2, QrCode, ArrowLeft, Download } from 'lucide-react';
import { clinicalTools } from '../../services/clinicalTools.js';

export default function Step4Confirmation({
  doctor,
  selectedDate,
  selectedSlot,
  selectedDuration,
  vitals,
  onBack,
  onBookingSuccess
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedPass, setConfirmedPass] = useState(null);

  const feeNumber = doctor?.feeAmount || 800;
  const platformFee = 0;
  const totalAmount = feeNumber + platformFee;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const res = clinicalTools.bookAppointment({
        doctorId: doctor.id,
        date: selectedDate,
        time: selectedSlot.startTime,
        durationMinutes: selectedDuration,
        patientName: vitals.patientName || 'Alex Morgan',
        patientPhone: vitals.patientPhone || '+1 (555) 019-2834',
        patientAge: vitals.patientAge || 29,
        bloodGroup: vitals.bloodGroup || 'O+',
        symptoms: vitals.symptoms || 'General Clinical Consultation',
        urgency: vitals.painLevel > 6 ? 'urgent' : 'routine',
        fee: doctor.consultationFee
      });

      setIsSubmitting(false);
      if (res.success) {
        setConfirmedPass(res.appointment);
        if (onBookingSuccess) onBookingSuccess(res.appointment);
      }
    }, 600);
  };

  if (confirmedPass) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-brand-teal/40 bg-brand-surface p-6 sm:p-8 text-center space-y-6 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/20 text-brand-teal ring-8 ring-brand-teal/10">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">
            Booking Confirmed & Verified
          </span>
          <h2 className="text-xl font-bold text-white mt-1">Digital Clinical Entry Pass</h2>
          <p className="text-xs text-slate-400 mt-1">Present this digital verification code at the clinic reception.</p>
        </div>

        {/* Digital Pass Ticket Box */}
        <div className="rounded-xl border border-brand-border bg-brand-dark p-5 text-left space-y-3 font-mono text-xs">
          <div className="flex justify-between border-b border-brand-border pb-2 text-slate-300">
            <span>PASS ID:</span>
            <strong className="text-brand-tealLight">{confirmedPass.id}</strong>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>PATIENT:</span>
            <span className="font-semibold text-white">{confirmedPass.patientName}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>SPECIALIST:</span>
            <span className="text-white">{confirmedPass.doctorName}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>DATE & TIME:</span>
            <span className="text-brand-tealLight font-semibold">
              {confirmedPass.date} at {confirmedPass.time}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>CLINIC ROOM:</span>
            <span className="text-white">{confirmedPass.room}</span>
          </div>
          <div className="flex justify-between text-slate-300 border-t border-brand-border pt-2">
            <span>STATUS:</span>
            <span className="text-emerald-400 font-semibold uppercase">{confirmedPass.status}</span>
          </div>
        </div>

        {/* Mock QR Representation */}
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2 text-slate-900 shadow-inner">
          <QrCode className="h-24 w-24" />
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-brand-border bg-brand-surfaceElevated px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Save / Print Pass
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-brand-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Confirmation & Payment Breakdown</h2>
        <p className="text-sm text-slate-400">Review consultation summary, specialist location, and fee schedule.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Summary */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Consultation Overview
          </h3>

          <div className="flex items-center gap-3 border-b border-brand-border pb-4">
            <img
              src={doctor?.photoUrl}
              alt={doctor?.name}
              className="h-12 w-12 rounded-xl object-cover border border-brand-border"
            />
            <div>
              <h4 className="text-sm font-bold text-white">{doctor?.name}</h4>
              <p className="text-xs text-brand-teal">{doctor?.specialty}</p>
              <p className="text-[11px] text-slate-400">{doctor?.roomNumber}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Scheduled Date:</span>
              <strong className="text-white">{selectedDate}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Scheduled Time:</span>
              <strong className="text-brand-tealLight">
                {selectedSlot?.timeFormatted} ({selectedDuration} mins)
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Patient:</span>
              <strong className="text-white">{vitals.patientName || 'Alex Morgan'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Contact:</span>
              <span className="text-slate-300">{vitals.patientPhone || '+1 (555) 019-2834'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reported Symptoms:</span>
              <span className="text-slate-300 max-w-[200px] truncate text-right">
                {vitals.symptoms || 'General Checkup'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Itemized Payment Breakdown */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Payment Breakdown
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Doctor Consultation OPD Fee:</span>
                <span>{doctor?.consultationFee}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>HealthSync AI Care Portal Fee:</span>
                <span className="text-brand-emerald font-semibold">FREE (Covered)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Clinical Tele-Triage Record:</span>
                <span className="text-brand-emerald font-semibold">Included</span>
              </div>

              <div className="border-t border-brand-border pt-3 flex justify-between text-sm">
                <span className="font-semibold text-white">Total Amount Payable at Clinic:</span>
                <span className="font-bold text-brand-tealLight text-base">{doctor?.consultationFee}</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-brand-dark/70 p-3 border border-brand-border text-[11px] text-slate-400 leading-relaxed">
              🛡️ <strong>No Advance Payment Required</strong>: Settle your consultation fee directly at the clinic reception upon check-in.
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="w-full rounded-xl bg-brand-teal py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-tealDark transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                Confirming Slot...
              </span>
            ) : (
              'Confirm Appointment & Generate Pass'
            )}
          </button>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-brand-border pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-brand-borderActive transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Edit Details
        </button>
      </div>
    </div>
  );
}
