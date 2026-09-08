import React, { useState } from 'react';
import { User, Phone, Upload, X, ArrowLeft, ArrowRight, Activity, FileText } from 'lucide-react';

const COMMON_SYMPTOMS = [
  'Headache / Migraine',
  'Fever & Chills',
  'Cough & Throat Pain',
  'Leg, Knee & Joint Pain',
  'Stomach / Gastric Acidity',
  'Chest Congestion / Wheezing',
  'Joint or Back Pain',
  'Skin Rash / Allergy',
  'Routine Executive Checkup',
  'Cardiology Telemetry Review'
];

export default function Step3VitalsSymptoms({ vitals, onChangeVitals, onBack, onNext }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState(
    vitals.symptomsList || ['Routine Executive Checkup']
  );
  const [uploadedFiles, setUploadedFiles] = useState(vitals.attachments || []);

  const toggleSymptom = (sym) => {
    const next = selectedSymptoms.includes(sym)
      ? selectedSymptoms.filter((s) => s !== sym)
      : [...selectedSymptoms, sym];
    setSelectedSymptoms(next);
    const symptomsStr = [
      ...next,
      ...(vitals.notes?.trim() ? [vitals.notes.trim()] : [])
    ].join(', ');
    onChangeVitals({ ...vitals, symptomsList: next, symptoms: symptomsStr || next.join(', ') });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let processedCount = 0;
    const newItems = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        newItems.push({
          name: file.name,
          type: file.type,
          dataUrl: uploadEvent.target.result,
          size: `${(file.size / 1024).toFixed(1)} KB`
        });
        processedCount += 1;
        if (processedCount === files.length) {
          setUploadedFiles((prev) => {
            const updated = [...prev, ...newItems];
            onChangeVitals({ ...vitals, attachments: updated });
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (idx) => {
    const updated = uploadedFiles.filter((_, i) => i !== idx);
    setUploadedFiles(updated);
    onChangeVitals({ ...vitals, attachments: updated });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-brand-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Patient Vitals & Clinical Intake</h2>
        <p className="text-sm text-slate-400">Please provide patient details and symptoms to prepare the clinical record.</p>
      </div>

      {/* Patient Information Form Grid */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-brand-teal" /> 1. Patient Demographics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={vitals.patientName || ''}
              onChange={(e) => onChangeVitals({ ...vitals, patientName: e.target.value })}
              placeholder="e.g. Alex Morgan"
              className="w-full rounded-xl border border-brand-border bg-brand-dark px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Phone Number</label>
            <div className="relative">
              <input
                type="tel"
                value={vitals.patientPhone || ''}
                onChange={(e) => onChangeVitals({ ...vitals, patientPhone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="w-full rounded-xl border border-brand-border bg-brand-dark px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
              />
              <Phone className="absolute right-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Age</label>
            <input
              type="number"
              min="1"
              max="120"
              value={vitals.patientAge || 29}
              onChange={(e) => onChangeVitals({ ...vitals, patientAge: e.target.value })}
              className="w-full rounded-xl border border-brand-border bg-brand-dark px-3.5 py-2.5 text-sm text-white focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Blood Group</label>
            <select
              value={vitals.bloodGroup || 'O+'}
              onChange={(e) => onChangeVitals({ ...vitals, bloodGroup: e.target.value })}
              className="w-full rounded-xl border border-brand-border bg-brand-dark px-3.5 py-2.5 text-sm text-white focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Multi-Select Symptom Tags */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-brand-teal" /> 2. Symptoms & Clinical Concerns
        </h3>
        <p className="text-xs text-slate-400">Select all conditions you would like to discuss with the specialist:</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {COMMON_SYMPTOMS.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym);
            return (
              <button
                key={sym}
                type="button"
                onClick={() => toggleSymptom(sym)}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-all border ${
                  isSelected
                    ? 'border-brand-teal bg-brand-teal/20 text-brand-tealLight shadow-sm'
                    : 'border-brand-border bg-brand-dark text-slate-300 hover:border-brand-borderActive hover:text-white'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {sym}
              </button>
            );
          })}
        </div>

        {/* Severity Slider */}
        <div className="pt-3 border-t border-brand-border/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Discomfort / Pain Level:</span>
            <span className="font-semibold text-brand-tealLight">
              {vitals.painLevel || 3} / 10 ({vitals.painLevel > 6 ? 'Severe' : vitals.painLevel > 3 ? 'Moderate' : 'Mild'})
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={vitals.painLevel || 3}
            onChange={(e) => onChangeVitals({ ...vitals, painLevel: parseInt(e.target.value, 10) })}
            className="w-full accent-brand-teal bg-brand-dark h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Specific Complaints / Description */}
        <div className="pt-3 border-t border-brand-border/60">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Additional Clinical Notes / Specific Complaints (Optional)
          </label>
          <textarea
            rows={2}
            value={vitals.notes || ''}
            onChange={(e) => {
              const nextNotes = e.target.value;
              const symptomsStr = [
                ...selectedSymptoms,
                ...(nextNotes.trim() ? [nextNotes.trim()] : [])
              ].join(', ');
              onChangeVitals({ ...vitals, notes: nextNotes, symptoms: symptomsStr || selectedSymptoms.join(', ') });
            }}
            placeholder="e.g. Sharp pain in both legs and knees for 2 days, worse while walking or climbing stairs..."
            className="w-full rounded-xl border border-brand-border bg-brand-dark px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal transition-all resize-none"
          />
        </div>
      </div>

      {/* Non-Intrusive File Upload Dropzone */}
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-brand-teal" /> 3. Attach Medical Records / X-Rays (Optional)
        </h3>

        <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-border hover:border-brand-teal bg-brand-dark/50 p-6 text-center cursor-pointer transition-colors group">
          <Upload className="h-6 w-6 text-slate-500 group-hover:text-brand-teal transition-colors mb-2" />
          <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
            Click to attach X-Rays, Lab Reports, or Photos
          </span>
          <span className="text-[11px] text-slate-500 mt-1">PNG, JPG, or PDF up to 25 MB</span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {uploadedFiles.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-brand-dark px-3 py-2 border border-brand-border text-xs"
              >
                <span className="truncate max-w-[200px] text-slate-200">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-rose-400 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between border-t border-brand-border pt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-brand-border px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-brand-borderActive transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Slots
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1.5 rounded-xl bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-tealDark transition-all"
        >
          Review & Confirmation <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
