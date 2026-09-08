# Production-Grade Refactoring: Patient Care Portal & Blessy Voice AI Agent

Act as a Principal Full-Stack Engineer and Lead Product Designer to completely refactor and overhaul the **HealthSync / Blessy AI** platform into a production-grade Medical-SaaS application.

---

## Overview of Architectural Transformation

This refactoring elevates the application from a multi-panel prototype into an enterprise-quality, human-centered healthcare platform with:
1. **Refined Medical-SaaS Design System**: Inter typography, neutral `#0A0F1D` background, subtle `#1E293B` borders, and clinical emerald/teal accents (`#0D9488`). All neon glows and chaotic colored badges are eliminated.
2. **Stepped Progressive Booking Wizard**: 4 clean sequential steps (Select Doctor &rarr; Date & Slots &rarr; Vitals & Symptoms &rarr; Confirmation & Payment) replacing the cluttered single-page form.
3. **Minimalist Siri/ChatGPT-Style Voice Overlay**: Zero-clutter center-stage animated morphing orb / soundwave pulse, floating status pill (`Listening...`, `Blessy is speaking...`, `Processing...`), and minimal controls (Mic, Keyboard, Language, Close).
4. **Empathetic Bilingual Conversational AI ("Blessy")**: Front Desk PA fluent in natural Hinglish, Hindi, and English with bedside manner, patient-led slot negotiation, and acute emergency triage interrupts.
5. **Deterministic Function-Calling Toolset**: Formally typed tools (`checkSlotAvailability`, `bookAppointment`, `rescheduleAppointment`, `blockDoctorCalendar`, `reportEmergency`) bound to a central calendar engine.
6. **WebRTC / WebSocket Real-Time Voice Streaming Client**: Production-grade client abstraction with bi-directional audio packet streaming and Web Speech fallback.
7. **Comprehensive JSON Schemas**: Formal schemas for Doctors, Slots, Appointments, Leaves, Emergencies, and Function Calls.
8. **React + Tailwind CSS Architecture**: Modular component hierarchy with reactive state management and fast Vite bundling.

---

## User Review Required

> [!IMPORTANT]
> **Tech Stack Transition**: We will transition the frontend into a modular **React + Tailwind CSS** component tree powered by Vite (with Node.js backend support). The design system strictly enforces `#0A0F1D` neutral dark slate, `#1E293B` borders, `#0D9488` teal accents, and Inter typography.

> [!NOTE]
> **Backward Compatibility**: All existing core features (Doctor/PA admin panel, emergency surgery shift logic, vacation leaves, 7-day routine protection, and digital QR passes) are preserved and upgraded to the new design system and component architecture.

---

## Proposed Changes

```
project 2/
├── package.json                          [NEW] React 18, Vite, Tailwind CSS, PostCSS, Lucide icons
├── vite.config.js                        [NEW] Vite configuration with React plugin
├── tailwind.config.js                    [NEW] Medical-SaaS theme tokens (#0A0F1D, #1E293B, #0D9488)
├── postcss.config.js                     [NEW] PostCSS setup
├── index.html                            [MODIFY] Root HTML mounting React app with Inter font
├── src/
│   ├── main.jsx                          [NEW] React root application entry point
│   ├── index.css                         [NEW] Tailwind directives & refined medical utility classes
│   ├── schemas/
│   │   └── clinicalSchemas.json          [NEW] Formal JSON schemas for Doctors, Slots, Appointments, etc.
│   ├── services/
│   │   ├── clinicalTools.js              [NEW] Deterministic function calling tools
│   │   ├── voiceStreamClient.js          [NEW] WebRTC / WebSocket real-time audio client
│   │   ├── scheduleEngine.js             [NEW/REFACTOR] Centralized calendar & conflict logic
│   │   └── storageService.js             [NEW/REFACTOR] Reactive state manager with LocalStorage fallback
│   ├── engines/
│   │   ├── blessyConversationEngine.js   [NEW/REFACTOR] Empathetic bilingual front-desk engine
│   │   └── speechSynthesisEngine.js      [NEW] Low-latency speech audio synthesis
│   └── components/
│       ├── layout/
│       │   ├── AppHeader.jsx             [NEW] Clean top navigation bar with role switcher & Voice button
│       │   └── ToastNotification.jsx     [NEW] Subtle toast notification stack
│       ├── wizard/
│       │   ├── BookingWizard.jsx         [NEW] 4-step progressive wizard container
│       │   ├── StepWizardProgress.jsx    [NEW] Minimalist step progress indicator (1-4)
│       │   ├── Step1DoctorSelect.jsx     [NEW] Doctor selection cards (Photo, specialty, next slot, fee)
│       │   ├── Step2DateTimeSlots.jsx    [NEW] Horizontal calendar strip + morning/afternoon/evening grids
│       │   ├── Step3VitalsSymptoms.jsx   [NEW] Vitals, multi-select symptom tags, clean file dropzone
│       │   └── Step4Confirmation.jsx     [NEW] Summary breakdown, payment preview & digital QR pass
│       ├── voice/
│       │   ├── VoiceOverlayModal.jsx     [NEW] Siri/ChatGPT-style center orb, status pill, minimal controls
│       │   ├── SoundwaveVisualizer.jsx   [NEW] Organic audio frequency pulse animation
│       │   └── KeyboardInputDrawer.jsx   [NEW] Slide-up text query input when mic is disabled
│       ├── admin/
│       │   ├── DoctorAdminConsole.jsx    [NEW] Clean doctor/PA dashboard (OT blockers, leaves, buffers)
│       │   └── SurgeryDelayModal.jsx     [NEW] Emergency OT delay broadcaster with auto-slot shift
│       └── patient/
│           └── PatientAppointments.jsx   [NEW] Active appointment cards, digital passes, records
```

---

### Component & System Specifications

#### 1. UI/UX Design System (`tailwind.config.js`, `src/index.css`)
- **Color Palette**:
  - Base Background: `#0A0F1D` (Deep clinical dark neutral)
  - Card Surfaces: `#111827` (Elevation 1), `#162032` (Elevation 2)
  - Borders: `#1E293B` (Soft neutral slate border)
  - Accents: Emerald / Teal `#0D9488` (Primary button, selected states), `#14B8A6` (Hover)
  - Secondary Accents: `#64748B` (Muted labels), `#38BDF8` (Information), `#EF4444` (Emergency red flag)
- **Typography**: Inter across all headings, badges, and body copy (`font-sans`).
- **Eliminating Clutter**: No neon glow effects, no nested multi-colored borders. Clean 1px borders with subtle shadow (`shadow-sm`, `shadow-md`).

#### 2. Progressive 4-Step Booking Wizard (`src/components/wizard/`)
- **Step 1 — Doctor Select**:
  - Doctor photo avatar with live presence dot.
  - Name, Title, Specialty, Experience, Rating.
  - Next available slot preview (e.g. `Next: Today 2:30 PM`).
  - Consultation fee tag (`₹800` / `$85`).
  - Single clear "Select Doctor" button.
- **Step 2 — Date & Time Slot**:
  - Horizontal 7-day scrollable calendar pill row.
  - Slot duration toggle: `15m`, `30m (Standard)`, `45m`, `60m`.
  - Structured slot groups:
    - 🌅 **Morning (08:00 AM – 12:00 PM)**
    - ☀️ **Afternoon (12:00 PM – 05:00 PM)**
    - 🌙 **Evening (05:00 PM – 09:00 PM)**
  - Slots labeled with clean states: `Available` (clickable teal chip), `Lunch/Dinner Break` (disabled soft amber tag), `Booked` (disabled slate tag), `In OT Surgery` (red tag).
- **Step 3 — Patient Vitals & Symptoms**:
  - Patient Full Name, Phone, Age, Blood Group.
  - Multi-select interactive symptom pills (`Headache`, `High Fever`, `Chest Discomfort`, `Skin Rash`, `Joint Strain`, `Routine Checkup`).
  - Severity / Pain level selector (1 to 10 scale).
  - Clean non-intrusive drag-and-drop document upload (X-rays, blood reports, prescriptions).
- **Step 4 — Confirmation & Payment Breakdown**:
  - Review card: Specialist, Date & Time, Room Number, Triage Urgency.
  - Itemized Fee: Doctor Consultation Fee, Platform Fee (`₹0`), GST/Taxes, Total Payable.
  - Action buttons: "Confirm & Generate Digital Pass" and "Back to Edit".

#### 3. Minimalist Siri / ChatGPT-Style Voice Overlay (`src/components/voice/`)
- **Center-Stage Visualizer**:
  - Organic glowing radial orb with fluid pulsing soundwave rings.
  - Fluid audio reactivity during speech.
- **Floating Status Pill**:
  - Directly beneath the orb: `● Listening...`, `● Blessy is speaking...`, `● Processing...`.
- **Zero-Clutter Controls**:
  - Top-Right: `✕` Exit button.
  - Bottom Dock:
    - 🎙️ Mic mute/unmute toggle.
    - ⌨️ Keyboard input toggle (for typing in noisy environments).
    - 🌐 Language switcher (`Auto (Hinglish)` | `हिन्दी` | `English`).

#### 4. Voice & Conversational Engine ("Blessy") (`src/engines/blessyConversationEngine.js`)
- Empathetic Doctor's PA greeting:
  - *"Namaste! Main Blessy, Dr. Akhilesh ki assistant. Main aapki appointment aur clinic queries mein kaise madad kar sakti hoon?"*
- Natural turn-taking with immediate verbal cadence.
- Full context retention for multi-turn negotiation:
  - *"Doctor Tuesday 5 baje milenge?"* &rarr; Checks calendar &rarr; *"Tuesday 5 baje Dr. Sharma OT mein hain, kya 6:30 PM ya Wednesday morning 11:00 AM chalega?"*
- Doctor staff voice actions:
  - *"Block my Monday 2 PM to 5 PM for seminar"* &rarr; Dispatches calendar block, shifts conflicting bookings.
  - *"Add emergency 15-min buffer after every 3 patients"* &rarr; Recalibrates slot schedule with 15m intervals.
- Emergency interrupt protocol:
  - Red flags (chest pain, breathlessness, loss of consciousness, stroke symptoms) trigger immediate safety alert:
  - *"Yeh emergency lag rahi hai. Kripya turant nazdeeki emergency room (ER) jaayein ya 108/911 helpline call karein. Hum booking hold par rakh rahe hain."*

#### 5. Deterministic Function-Calling Tools (`src/services/clinicalTools.js`)
Deterministic tool implementations with parameter validation:
1. `checkSlotAvailability({ doctorId, date, timePreference, durationMinutes })`
2. `bookAppointment({ doctorId, date, time, patientName, patientPhone, symptoms, urgency, fee })`
3. `rescheduleAppointment({ appointmentId, newDate, newTime, reason })`
4. `blockDoctorCalendar({ doctorId, date, startTime, endTime, reason, shiftAppointmentsNextDay })`
5. `reportEmergency({ patientName, symptoms, location, urgencyLevel })`

#### 6. WebRTC / WebSocket Audio Streaming Client (`src/services/voiceStreamClient.js`)
- Bi-directional client abstraction with connection state machine (`IDLE`, `CONNECTING`, `STREAMING`, `DISCONNECTED`).
- Handles audio buffering, PCM audio chunking, and bi-directional message protocol.
- Fallback to Web Speech API when operating in standalone browser mode.

#### 7. Formal JSON Schemas (`src/schemas/clinicalSchemas.json`)
- Complete JSON Schemas for `Doctor`, `Slot`, `Appointment`, `Leave`, `EmergencyReport`, and `FunctionToolCall`.

---

## Verification Plan

### Automated Tests
1. `npm test` / Node test script:
   - Verify deterministic function calls: `checkSlotAvailability`, `bookAppointment`, `rescheduleAppointment`, `blockDoctorCalendar`, `reportEmergency`.
   - Verify schedule conflict detection, buffer calculations, meal break preservation, and emergency OT auto-shifting.
   - Verify conversational intent classification, Hinglish fluency, and emergency safety triage interrupts.
2. Build verification:
   - Run `npm run build` to verify clean TypeScript/JSX compilation with zero lint or bundling errors.

### Manual Verification
1. Test Stepped Booking Wizard from Step 1 to Step 4.
2. Test Minimalist Voice Overlay (mic toggle, status pill transitions, Siri/ChatGPT-style orb, language switcher).
3. Test natural language voice negotiation ("Tuesday 5 baje slot hai?", "Haan book kar do", "Emergency chest pain").
4. Test Doctor Admin actions (block time, broadcast delay, schedule buffer).
