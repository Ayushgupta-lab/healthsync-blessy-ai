import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Select Doctor', description: 'Choose verified specialist' },
  { id: 2, label: 'Date & Slot', description: 'Pick consultation time' },
  { id: 3, label: 'Vitals & Symptoms', description: 'Describe health concerns' },
  { id: 4, label: 'Confirmation', description: 'Review & payment breakdown' },
];

export default function StepWizardProgress({ currentStep, onStepClick }) {
  return (
    <div className="w-full border-b border-brand-border bg-brand-surface/40 py-4 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;

            return (
              <li
                key={step.id}
                onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
                className={`flex items-center gap-3 rounded-xl p-2.5 transition-all border ${
                  isActive
                    ? 'border-brand-teal/50 bg-brand-teal/10 shadow-sm'
                    : isCompleted
                    ? 'border-brand-border bg-brand-surface cursor-pointer hover:border-brand-borderActive'
                    : 'border-transparent opacity-50'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    isCompleted
                      ? 'bg-brand-teal text-white'
                      : isActive
                      ? 'bg-brand-teal text-white ring-4 ring-brand-teal/20'
                      : 'bg-brand-surfaceElevated text-slate-400 border border-brand-border'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : step.id}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isActive ? 'text-brand-tealLight' : isCompleted ? 'text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="hidden sm:block text-[11px] text-slate-500 truncate">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
