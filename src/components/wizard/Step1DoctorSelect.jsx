import React from 'react';
import { Star, Clock, Check, ShieldCheck } from 'lucide-react';
import { scheduleEngine } from '../../services/scheduleEngine.js';

export default function Step1DoctorSelect({ doctors, selectedDoctorId, onSelectDoctor, onNext }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Select Medical Specialist</h2>
          <p className="text-sm text-slate-400">Choose a board-certified clinical physician for your consultation.</p>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-brand-surface px-2.5 py-1 rounded-lg border border-brand-border self-start sm:self-auto">
          {doctors.length} Doctors Available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {doctors.map((doc) => {
          const isSelected = doc.id === selectedDoctorId;
          const nextSlot = scheduleEngine.getNextAvailableSlot(doc.id);

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDoctor(doc.id)}
              className={`group relative flex flex-col justify-between rounded-2xl p-5 transition-all cursor-pointer border ${
                isSelected
                  ? 'border-brand-teal bg-brand-surfaceElevated ring-2 ring-brand-teal/20 shadow-md'
                  : 'border-brand-border bg-brand-surface hover:border-brand-borderActive hover:bg-brand-surfaceElevated/60'
              }`}
            >
              <div>
                {/* Header with Photo & Verification */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <img
                      src={doc.photoUrl}
                      alt={doc.name}
                      className="h-14 w-14 rounded-xl object-cover border border-brand-border"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-teal text-white ring-2 ring-brand-surface">
                      <ShieldCheck className="h-2.5 w-2.5" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white group-hover:text-brand-tealLight transition-colors truncate">
                      {doc.name}
                    </h3>
                    <p className="text-xs text-brand-teal font-medium truncate">{doc.specialty}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {doc.rating}
                      </span>
                      <span>•</span>
                      <span>{doc.experience}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">{doc.bio}</p>

                {/* Next available slot pill */}
                <div className="flex items-center gap-2 rounded-xl bg-brand-dark/70 px-3 py-2 border border-brand-border text-xs mb-4">
                  <Clock className="h-3.5 w-3.5 text-brand-teal" />
                  <span className="text-slate-400">Next Slot:</span>
                  <strong className="text-slate-200">
                    {nextSlot ? `${nextSlot.date} at ${nextSlot.slot.timeFormatted}` : 'Consult Blessy for slots'}
                  </strong>
                </div>
              </div>

              {/* Card Footer: Fee & Select Button */}
              <div className="flex items-center justify-between border-t border-brand-border/70 pt-4 mt-2">
                <div>
                  <span className="text-[11px] text-slate-400 block">Consultation Fee</span>
                  <span className="text-sm font-bold text-white">{doc.consultationFee}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDoctor(doc.id);
                    onNext();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-brand-teal text-white shadow-sm hover:bg-brand-tealDark'
                      : 'border border-brand-border bg-brand-surfaceElevated text-slate-300 hover:border-brand-teal hover:text-white'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Selected
                    </>
                  ) : (
                    'Choose Doctor'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-tealDark transition-all"
        >
          Continue to Choose Slot &rarr;
        </button>
      </div>
    </div>
  );
}
