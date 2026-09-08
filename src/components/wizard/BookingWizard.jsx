import React, { useState } from 'react';
import StepWizardProgress from './StepWizardProgress.jsx';
import Step1DoctorSelect from './Step1DoctorSelect.jsx';
import Step2DateTimeSlots from './Step2DateTimeSlots.jsx';
import Step3VitalsSymptoms from './Step3VitalsSymptoms.jsx';
import Step4Confirmation from './Step4Confirmation.jsx';

export default function BookingWizard({ doctors, onBookingComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || 'doc_akhilesh');
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [vitals, setVitals] = useState({
    patientName: 'Alex Morgan',
    patientPhone: '+1 (555) 019-2834',
    patientAge: 29,
    bloodGroup: 'O+',
    symptoms: 'Routine Executive Checkup',
    painLevel: 3,
    attachments: []
  });

  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  return (
    <div className="rounded-3xl border border-brand-border bg-brand-surfaceElevated/40 backdrop-blur-md overflow-hidden shadow-xl">
      {/* 4-Step Progressive Stepper */}
      <StepWizardProgress
        currentStep={currentStep}
        onStepClick={(stepId) => setCurrentStep(stepId)}
      />

      <div className="p-5 sm:p-8">
        {currentStep === 1 && (
          <Step1DoctorSelect
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={(id) => setSelectedDoctorId(id)}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2DateTimeSlots
            doctor={currentDoctor}
            selectedDate={selectedDate}
            onDateChange={(date) => setSelectedDate(date)}
            selectedDuration={selectedDuration}
            onDurationChange={(dur) => setSelectedDuration(dur)}
            selectedSlot={selectedSlot}
            onSlotSelect={(slot) => setSelectedSlot(slot)}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step3VitalsSymptoms
            vitals={vitals}
            onChangeVitals={(nextVitals) => setVitals(nextVitals)}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Step4Confirmation
            doctor={currentDoctor}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            selectedDuration={selectedDuration}
            vitals={vitals}
            onBack={() => setCurrentStep(3)}
            onBookingSuccess={(apt) => {
              if (onBookingComplete) onBookingComplete(apt);
            }}
          />
        )}
      </div>
    </div>
  );
}
