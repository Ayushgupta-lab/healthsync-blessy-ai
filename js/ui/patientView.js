// Patient Portal View: Doctor selection, break schedule visualizer, slot picker, and appointments
// Enhanced with Doctor Life factors: Emergency surgeries, Leaves, Variable Durations, Reports/Images, and Symptom Helper
import { storage } from '../utils/storage.js';
import { scheduleEngine, formatTime12 } from '../engines/scheduleEngine.js';
import { notifier } from '../utils/notifications.js';

export class PatientView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedDoctorId = "doc_akhilesh"; // Default to Dr. Akhilesh Sharma
    this.selectedDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Default tomorrow
    this.selectedSlot = null;
    this.selectedDuration = 30; // 15 | 30 | 45 | 60 mins
    this.painLevel = 3;
    this.uploadedAttachments = []; // Telehealth reports and symptom images

    this.bindStorageEvents();
  }

  bindStorageEvents() {
    storage.subscribe('doctors:changed', () => this.render());
    storage.subscribe('appointments:changed', () => {
      this.renderSlots();
      this.renderMyAppointments();
    });
  }

  init() {
    this.render();
  }

  render() {
    if (!this.container) return;
    const doctors = storage.getDoctors();
    const currentDoctor = storage.getDoctorById(this.selectedDoctorId) || doctors[0];
    const patient = storage.getActivePatient() || { name: "Alex Morgan", phone: "+1 (555) 019-2834" };

    // Check Doctor Life real-world alerts for selected doctor
    const activeSurgery = scheduleEngine.getDoctorActiveSurgery(currentDoctor.id, this.selectedDate);
    const activeLeave = scheduleEngine.isDoctorOnLeave(currentDoctor.id, this.selectedDate);
    const runningDelay = currentDoctor.runningDelayMinutes || 0;

    let alertBannerHtml = '';
    if (activeSurgery) {
      alertBannerHtml += `
        <div class="doc-life-alert surgery">
          <div>
            <strong>🚨 Doctor in Emergency Surgery (OT)</strong>
            <span>${currentDoctor.name} is currently in an acute surgical procedure (${formatTime12(activeSurgery.startTime)} – ${formatTime12(activeSurgery.endTime)}) in ${activeSurgery.otRoom || 'OT-1'}. Regular slots are protected.</span>
          </div>
          <span class="badge badge-booked">OT In Progress</span>
        </div>
      `;
    }

    if (activeLeave) {
      alertBannerHtml += `
        <div class="doc-life-alert leave">
          <div>
            <strong>🌴 Doctor on Scheduled Vacation / Leave (${activeLeave.title || 'Out of Station'})</strong>
            <span>${currentDoctor.name} is on recess from ${activeLeave.startDate} to ${activeLeave.endDate} (${activeLeave.reason}). OPD re-opens after return.</span>
          </div>
          <span class="badge" style="background: rgba(139, 92, 246, 0.3); color: #c084fc;">On Leave</span>
        </div>
      `;
    }

    if (runningDelay > 0) {
      alertBannerHtml += `
        <div class="doc-life-alert delay">
          <div>
            <strong>⏱️ Live Clinic Notice: Running ~${runningDelay} mins behind schedule</strong>
            <span>${currentDoctor.name} is taking extra care on an ongoing critical case. All slots are auto-buffered.</span>
          </div>
          <span class="badge badge-pending_pa">+${runningDelay}m Delay</span>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="patient-header-hero">
        <div class="hero-title-group">
          <h2>Patient Care Portal</h2>
          <p>Schedule your clinical consultation with human-centered AI assistance & respectful doctor scheduling.</p>
        </div>

        <div class="hero-actions-cluster" style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
          <button class="ai-assistant-banner-btn" id="open-ai-chat-btn">
            <div class="ai-banner-icon"><img src="assets/blessy_logo.jpg" alt="Blessy" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"></div>
            <div class="ai-banner-text">
              <strong>Chat with Blessy AI</strong>
              <span>Doctor's Executive PA & Appointment Chat &rarr;</span>
            </div>
          </button>

          <button class="ai-assistant-banner-btn voice-hero-btn" id="open-ai-voice-btn" style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(99, 102, 241, 0.25)); border-color: var(--accent-cyan);">
            <div class="ai-banner-icon" style="background: linear-gradient(135deg, #0284c7, #6366f1); box-shadow: 0 0 14px var(--accent-cyan-glow);"><img src="assets/blessy_logo.jpg" alt="Blessy" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;"></div>
            <div class="ai-banner-text">
              <strong style="color: #67e8f9;">Blessy Live Voice AI</strong>
              <span>Hands-free voice in Hindi & English (Say "Hello Blessy") &rarr;</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Real-time Doctor Life Alert Banners (Surgeries, Leaves, Delays) -->
      ${alertBannerHtml}

      <!-- Doctor Selection Row -->
      <section class="patient-doctors-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="font-family: var(--font-heading); font-size: 1.25rem;">1. Select Specialist</h3>
          <span style="font-size: 0.82rem; color: var(--text-secondary);">Showing certified clinic doctors</span>
        </div>
        <div class="doctor-cards-grid" id="doctor-cards-container">
          <!-- Populated dynamically -->
        </div>
      </section>

      <!-- Doctor Daily Routine & Breaks Banner -->
      <section class="doctor-routine-banner" id="doctor-routine-banner">
        <!-- Populated dynamically -->
      </section>

      <!-- Booking Matrix & Intake Form -->
      <div class="booking-section-grid">
        <!-- Left: Date, Duration & Time Slots -->
        <div class="glass-card">
          <h3 style="font-family: var(--font-heading); font-size: 1.2rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span>2. Choose Date & Consultation Slot</span>
            <span id="slot-day-label" style="font-size: 0.85rem; color: var(--accent-cyan);"></span>
          </h3>

          <!-- Variable Consultation Duration Selector -->
          <div style="margin-bottom: 0.85rem;">
            <label class="form-label" style="display: flex; justify-content: space-between;">
              <span>Consultation Type & Duration:</span>
              <strong id="selected-duration-label" style="color: var(--accent-cyan); font-size: 0.82rem;">${this.selectedDuration} Minutes</strong>
            </label>
            <div class="duration-selector-row">
              <div class="duration-pill ${this.selectedDuration === 15 ? 'active' : ''}" data-duration="15">
                <strong>⏱️ 15 Min</strong>
                <span>Quick Follow-up</span>
              </div>
              <div class="duration-pill ${this.selectedDuration === 30 ? 'active' : ''}" data-duration="30">
                <strong>⏱️ 30 Min</strong>
                <span>Standard Visit</span>
              </div>
              <div class="duration-pill ${this.selectedDuration === 45 ? 'active' : ''}" data-duration="45">
                <strong>⏱️ 45 Min</strong>
                <span>Detailed Exam</span>
              </div>
              <div class="duration-pill ${this.selectedDuration === 60 ? 'active' : ''}" data-duration="60">
                <strong>⏱️ 60 Min</strong>
                <span>Complex Triage</span>
              </div>
            </div>
          </div>

          <!-- Date Selector Tabs -->
          <div class="date-selector-bar" id="date-selector-bar">
            <!-- Populated dynamically -->
          </div>

          <!-- Slots Legend -->
          <div class="slot-legend">
            <div class="legend-item"><div class="legend-box avail"></div> Available</div>
            <div class="legend-item"><div class="legend-box break"></div> Doctor Break (Meals & Rest)</div>
            <div class="legend-item"><div class="legend-box booked"></div> Reserved</div>
          </div>

          <!-- Slots Grid -->
          <div class="slot-grid" id="patient-slot-grid">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Right: Patient Intake & Telehealth Attachment Form -->
        <div class="glass-card intake-summary-card">
          <h3 style="font-family: var(--font-heading); font-size: 1.2rem; margin-bottom: 1.25rem;">
            3. Patient Intake & Reports
          </h3>

          <form id="patient-booking-form">
            <div class="form-group">
              <label class="form-label">Patient Name</label>
              <input type="text" class="form-input" id="patient-name-input" value="${patient.name}" required>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" class="form-input" id="patient-phone-input" value="${patient.phone}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Patient Age</label>
                <input type="number" class="form-input" id="patient-age-input" value="${patient.age || 30}" min="1" max="110">
              </div>
            </div>

            <!-- Smart Symptom / Problem Helper -->
            <div class="form-group">
              <label class="form-label">Primary Symptoms / Reason for Consultation</label>
              <div class="symptom-helper-tray">
                <span style="font-size: 0.72rem; color: var(--text-muted); width: 100%;">💡 Click common medical concern to auto-fill:</span>
                <button type="button" class="symptom-helper-chip" data-symptom="Chest tightness, elevated blood pressure, and occasional palpitations" data-pain="6">💓 Chest & BP</button>
                <button type="button" class="symptom-helper-chip" data-symptom="Severe throbbing headache, light sensitivity, and nausea for 3 days" data-pain="5">🤕 Migraine / Headache</button>
                <button type="button" class="symptom-helper-chip" data-symptom="Itchy red skin rash, mild swelling, and allergic reaction" data-pain="3">🩹 Skin Rash / Allergy</button>
                <button type="button" class="symptom-helper-chip" data-symptom="Fever of 101°F, chills, dry cough, and fatigue for 2 days" data-pain="4">🤒 Fever & Cough</button>
                <button type="button" class="symptom-helper-chip" data-symptom="Persistent lower back pain, knee stiffness, and joint ache" data-pain="5">🦴 Joint & Back Pain</button>
                <button type="button" class="symptom-helper-chip" data-symptom="Routine annual physical examination and preventive blood work" data-pain="0">🩺 Routine Checkup</button>
              </div>
              <textarea class="form-textarea" id="patient-symptoms-input" rows="3" placeholder="Describe symptoms or click a helper chip above..." required></textarea>
            </div>

            <!-- Pain Scale Slider -->
            <div class="form-group pain-scale-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Pain / Discomfort Level: <strong id="pain-val-display" style="color: var(--accent-cyan);">${this.painLevel} / 10</strong></span>
                <span id="pain-severity-tag" class="badge" style="background: rgba(6, 182, 212, 0.15); color: #38bdf8;">Mild</span>
              </label>
              <input type="range" class="pain-slider" id="pain-slider" min="0" max="10" value="${this.painLevel}">
              <div class="pain-labels">
                <span>0 (None)</span>
                <span>5 (Moderate)</span>
                <span>10 (Severe)</span>
              </div>
            </div>

            <!-- Bidirectional Reports & Symptom Image Attachments -->
            <div class="attachment-upload-section">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Attach Medical Reports & Photos (Telehealth)</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">PNG, JPG, PDF</span>
              </label>
              <div class="attachment-dropzone" id="patient-attachment-dropzone">
                <input type="file" id="patient-file-input" style="display:none;" accept="image/*,.pdf" multiple>
                <div>📸 Click or Drag & Drop to attach Lab Report / Symptom Photo</div>
                <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.5rem;">
                  <button type="button" class="btn btn-secondary btn-sm" id="sample-ecg-btn">➕ Sample ECG Report</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="sample-skin-btn">➕ Sample Skin Rash Photo</button>
                </div>
              </div>
              <div class="attachment-previews-tray" id="patient-attachment-previews">
                <!-- Dynamically rendered -->
              </div>
            </div>

            <!-- Booking Summary Box -->
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1.25rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-secondary);">Selected Doctor:</span>
                <strong id="summary-doc-name">${currentDoctor.name}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-secondary);">Consultation Type:</span>
                <strong id="summary-duration" style="color: #ffffff;">${this.selectedDuration} Mins</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-secondary);">Date & Time:</span>
                <strong id="summary-datetime" style="color: var(--accent-cyan);">Please select a time slot</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                <span style="color: var(--text-secondary);">Consultation Fee:</span>
                <strong>${currentDoctor.consultationFee}</strong>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" id="submit-booking-btn" style="width: 100%;" disabled>
              Confirm Appointment Booking
            </button>
          </form>
        </div>
      </div>

      <!-- My Appointments Dashboard -->
      <section class="my-appointments-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h3>My Scheduled Appointments & Medical Records</h3>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">Manage active bookings, view digital passes, lab reports & doctor prescriptions.</p>
          </div>
          <span id="apt-count-badge" class="badge badge-confirmed">3 Active</span>
        </div>

        <div class="appointments-cards-grid" id="my-appointments-grid">
          <!-- Populated dynamically -->
        </div>
      </section>

      <!-- Digital Pass Modal Placeholder -->
      <div id="digital-pass-modal" class="modal-overlay"></div>
    `;

    this.renderDoctorCards();
    this.renderRoutineBanner();
    this.renderDateTabs();
    this.renderSlots();
    this.renderAttachmentPreviews();
    this.renderMyAppointments();
    this.bindEvents();
  }

  renderDoctorCards() {
    const container = document.getElementById('doctor-cards-container');
    if (!container) return;
    const doctors = storage.getDoctors();

    container.innerHTML = doctors.map(doc => {
      const isSelected = doc.id === this.selectedDoctorId;
      const liveStatus = scheduleEngine.getCurrentStatus(doc);

      return `
        <div class="doc-card ${isSelected ? 'selected' : ''}" data-doc-id="${doc.id}">
          <div class="doc-card-top">
            <div class="doc-avatar-wrapper">
              <div class="doc-avatar">${doc.avatar}</div>
              <div class="doc-live-dot ${liveStatus.status}"></div>
            </div>
            <div class="doc-info-block">
              <h3>${doc.name}</h3>
              <div class="doc-specialty-badge">${doc.specialty}</div>
              <div class="doc-metrics">
                <span>⭐ ${doc.rating} (${doc.reviewsCount})</span>
                <span>•</span>
                <span>💼 ${doc.experience}</span>
              </div>
            </div>
          </div>

          <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.75rem; line-height: 1.4;">
            ${doc.bio}
          </p>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
            <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">${doc.consultationFee} <small style="font-weight: 400; color: var(--text-muted);">/ visit</small></span>
            <span class="badge ${isSelected ? 'badge-confirmed' : 'badge-available'}">
              ${isSelected ? '✓ Selected' : 'Choose Doctor'}
            </span>
          </div>

          <!-- Doctor Live Status Badge -->
          <div class="doc-live-status-pill status-${liveStatus.status}">
            <span>${liveStatus.icon}</span>
            <span><strong>${liveStatus.label}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.doc-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedDoctorId = card.dataset.docId;
        this.selectedSlot = null;
        this.render();
      });
    });
  }

  renderRoutineBanner() {
    const banner = document.getElementById('doctor-routine-banner');
    if (!banner) return;
    const doctor = storage.getDoctorById(this.selectedDoctorId);
    if (!doctor) return;

    banner.innerHTML = `
      <div class="guarantee-pill">
        <span class="guarantee-icon">🛡️</span>
        <div class="guarantee-text">
          <strong>Intelligent Scheduling with ${doctor.name}:</strong>
          <span>Doctor meal breaks, clinical rounds & rest hours are automatically protected in the schedule. Ask Blessy AI if you need specific schedule details.</span>
        </div>
      </div>
    `;
  }

  renderDateTabs() {
    const bar = document.getElementById('date-selector-bar');
    if (!bar) return;

    const now = new Date();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({ iso, dayName, dayNum, isSelected: iso === this.selectedDate });
    }

    bar.innerHTML = days.map(d => `
      <div class="date-pill-btn ${d.isSelected ? 'active' : ''}" data-date="${d.iso}">
        <div class="date-pill-day">${d.dayName}</div>
        <div class="date-pill-num">${d.dayNum}</div>
      </div>
    `).join('');

    bar.querySelectorAll('.date-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedDate = btn.dataset.date;
        this.selectedSlot = null;
        this.renderDateTabs();
        this.renderSlots();
        this.updateFormSummary();
      });
    });

    const dayLabel = document.getElementById('slot-day-label');
    if (dayLabel) {
      dayLabel.textContent = `Date: ${this.selectedDate}`;
    }
  }

  renderSlots() {
    const grid = document.getElementById('patient-slot-grid');
    if (!grid) return;

    const slots = scheduleEngine.getDaySchedule(this.selectedDoctorId, this.selectedDate, this.selectedDuration);

    // If entire day is on leave / vacation
    if (slots.length > 0 && slots[0].status === 'leave') {
      const l = slots[0].meta;
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem; background: rgba(139, 92, 246, 0.1); border: 1px dashed rgba(139, 92, 246, 0.4); border-radius: var(--radius-md);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🌴</div>
          <h4 style="color: #c084fc;">${l.title}</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 0.35rem;">${l.message}</p>
          <p style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 0.5rem;">Please select another date tab above to book.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = slots.map(slot => {
      let statusClass = slot.status; // available, break, booked, surgery
      let subText = 'Open';
      let tooltip = '';

      if (slot.status === 'surgery') {
        subText = '🚨 OT Surgery';
        tooltip = slot.meta?.message || 'Doctor in Emergency Operation';
      } else if (slot.status === 'break') {
        subText = `${slot.meta.breakIcon} ${slot.meta.breakName.split(' ')[0]}`;
        tooltip = `${slot.meta.breakIcon} ${slot.meta.breakName} (${formatTime12(slot.meta.startTime)} - ${formatTime12(slot.meta.endTime)}) - Doctor resting`;
      } else if (slot.status === 'booked') {
        subText = 'Reserved';
        tooltip = 'Slot already booked';
      }

      const isSelected = this.selectedSlot === slot.startTime;

      return `
        <div class="slot-chip ${statusClass} ${isSelected ? 'selected' : ''}" 
             data-time="${slot.startTime}" 
             data-status="${slot.status}"
             data-tooltip="${tooltip}">
          <div class="slot-time">${slot.timeFormatted}</div>
          <div class="slot-sub">${subText}</div>
        </div>
      `;
    }).join('');

    // Attach click events on available slots
    grid.querySelectorAll('.slot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const status = chip.dataset.status;
        const time = chip.dataset.time;

        if (status === 'surgery') {
          notifier.showToast("Doctor is currently in an Emergency Operation (OT). Please choose another time.", "warning");
          return;
        }

        if (status === 'break') {
          notifier.showToast(`Doctor is on meal/rest break at ${formatTime12(time)} (${chip.getAttribute('data-tooltip')})`, 'break');
          return;
        }

        if (status === 'booked') {
          notifier.showToast(`This slot is already reserved by another patient.`, 'warning');
          return;
        }

        this.selectedSlot = time;
        this.renderSlots();
        this.updateFormSummary();
      });
    });
  }

  updateFormSummary() {
    const summaryTime = document.getElementById('summary-datetime');
    const submitBtn = document.getElementById('submit-booking-btn');
    const durationLabel = document.getElementById('summary-duration');

    if (durationLabel) durationLabel.textContent = `${this.selectedDuration} Mins`;

    if (this.selectedSlot) {
      if (summaryTime) summaryTime.textContent = `${this.selectedDate} at ${formatTime12(this.selectedSlot)} (${this.selectedDuration} mins)`;
      if (submitBtn) submitBtn.removeAttribute('disabled');
    } else {
      if (summaryTime) summaryTime.textContent = "Please select a time slot";
      if (submitBtn) submitBtn.setAttribute('disabled', 'true');
    }
  }

  renderAttachmentPreviews() {
    const tray = document.getElementById('patient-attachment-previews');
    if (!tray) return;

    if (this.uploadedAttachments.length === 0) {
      tray.innerHTML = '';
      return;
    }

    tray.innerHTML = this.uploadedAttachments.map((att, idx) => `
      <div class="attachment-preview-card">
        <span>${att.previewIcon || '📎'}</span>
        <strong>${att.name}</strong>
        <button type="button" class="attachment-remove-btn" data-idx="${idx}" title="Remove file">&times;</button>
      </div>
    `).join('');

    tray.querySelectorAll('.attachment-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        this.uploadedAttachments.splice(idx, 1);
        this.renderAttachmentPreviews();
        notifier.showToast("Attachment removed.", "info");
      });
    });
  }

  renderMyAppointments() {
    const grid = document.getElementById('my-appointments-grid');
    const badge = document.getElementById('apt-count-badge');
    if (!grid) return;

    const appointments = storage.getAppointments().filter(a => a.status !== 'cancelled');
    if (badge) badge.textContent = `${appointments.length} Active`;

    if (appointments.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
          <h4>No Upcoming Appointments</h4>
          <p style="color: var(--text-secondary); font-size: 0.88rem;">Select a doctor above or talk to Aura AI to book your first consultation.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = appointments.map(apt => {
      const doctor = storage.getDoctorById(apt.doctorId) || { name: "Doctor", specialty: "General" };

      const attachmentsHtml = apt.attachments && apt.attachments.length > 0
        ? `<div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.4rem;">
            ${apt.attachments.map(att => `<span class="badge" style="background: rgba(6, 182, 212, 0.15); font-size: 0.72rem; color: #38bdf8;">${att.previewIcon || '📎'} ${att.name}</span>`).join('')}
          </div>`
        : '';

      const rxHtml = apt.doctorPrescription 
        ? `<div class="digital-prescription-box">
             <strong>🩺 Rx Doctor Prescription:</strong><br>${apt.doctorPrescription}
           </div>`
        : '';

      return `
        <div class="apt-card">
          <div>
            <div class="apt-card-header">
              <div>
                <span class="apt-id">${apt.id}</span>
                <div class="apt-doc-name">${doctor.name}</div>
                <div style="font-size: 0.78rem; color: var(--accent-cyan);">${doctor.specialty}</div>
              </div>
              <span class="badge badge-${apt.status}">
                ${apt.status === 'confirmed' ? '✓ Confirmed' : apt.status === 'pending_pa' ? '⏳ Pending PA' : apt.status}
              </span>
            </div>

            <div class="apt-meta-row">
              <span>📅 <strong>${apt.date}</strong></span>
              <span>⏱️ <strong>${formatTime12(apt.time)}</strong> (${apt.durationMinutes || 30} mins)</span>
            </div>

            <div class="apt-symptoms-snippet">
              <strong>Symptom note:</strong> ${apt.symptoms || "Routine medical checkup"}
            </div>

            ${attachmentsHtml}
            ${rxHtml}
          </div>

          <div class="apt-actions-row" style="margin-top: 0.85rem;">
            <button class="btn btn-secondary btn-sm view-pass-btn" data-id="${apt.id}">
              🎫 Digital Pass
            </button>
            <button class="btn btn-danger btn-sm cancel-apt-btn" data-id="${apt.id}">
              Cancel
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.view-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showDigitalPass(btn.dataset.id));
    });

    grid.querySelectorAll('.cancel-apt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm("Are you sure you want to cancel this appointment?")) {
          storage.updateAppointment(btn.dataset.id, { status: 'cancelled' });
          notifier.showToast("Appointment cancelled successfully.", "info");
        }
      });
    });
  }

  showDigitalPass(appointmentId) {
    const modal = document.getElementById('digital-pass-modal');
    if (!modal) return;
    const apt = storage.getAppointments().find(a => a.id === appointmentId);
    if (!apt) return;
    const doctor = storage.getDoctorById(apt.doctorId);

    const attachmentsList = apt.attachments && apt.attachments.length > 0
      ? `<div style="margin-top: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm);">
          <div style="font-size: 0.75rem; color: var(--accent-cyan); margin-bottom: 0.35rem; font-weight: 700;">ATTACHED MEDICAL REPORTS & PHOTOS:</div>
          ${apt.attachments.map(a => `<div style="font-size: 0.82rem; color: #ffffff;">${a.previewIcon || '📄'} ${a.name}</div>`).join('')}
        </div>`
      : '';

    const rxContent = apt.doctorPrescription
      ? `<div class="digital-prescription-box" style="margin-top: 0.75rem;">
          <strong style="color: #34d399;">🩺 Official Doctor Prescription (Rx):</strong>
          <p style="margin-top: 0.25rem;">${apt.doctorPrescription}</p>
        </div>`
      : '';

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <h3>Official Appointment Pass</h3>
          <button class="toast-close" id="close-pass-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="digital-pass-card">
            <div class="pass-header">
              <div>
                <div style="font-size: 0.72rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.05em;">HealthSync Medical Center</div>
                <div style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 700; color: #ffffff;">${doctor.name}</div>
                <div style="font-size: 0.82rem; color: #94a3b8;">${doctor.title}</div>
              </div>
              <div class="pass-qr-mock">
                <svg viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white"/>
                  <rect x="10" y="10" width="25" height="25" fill="#0f172a"/>
                  <rect x="15" y="15" width="15" height="15" fill="white"/>
                  <rect x="18" y="18" width="9" height="9" fill="#0f172a"/>
                  <rect x="65" y="10" width="25" height="25" fill="#0f172a"/>
                  <rect x="70" y="15" width="15" height="15" fill="white"/>
                  <rect x="73" y="18" width="9" height="9" fill="#0f172a"/>
                  <rect x="10" y="65" width="25" height="25" fill="#0f172a"/>
                  <rect x="15" y="70" width="15" height="15" fill="white"/>
                  <rect x="18" y="73" width="9" height="9" fill="#0f172a"/>
                  <rect x="42" y="15" width="10" height="10" fill="#0f172a"/>
                  <rect x="42" y="35" width="16" height="20" fill="#0f172a"/>
                  <rect x="65" y="45" width="20" height="10" fill="#0f172a"/>
                  <rect x="65" y="65" width="25" height="25" fill="#0f172a"/>
                </svg>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.85rem;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">PATIENT</div>
                <strong style="color: #ffffff; font-size: 0.95rem;">${apt.patientName}</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">APPOINTMENT ID</div>
                <strong style="color: var(--accent-cyan); font-family: monospace;">${apt.id}</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">DATE & TIME</div>
                <strong style="color: #38bdf8;">${apt.date} at ${formatTime12(apt.time)}</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">DURATION</div>
                <strong style="color: #ffffff;">${apt.durationMinutes || 30} Minutes</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">CLINIC ROOM</div>
                <strong style="color: #ffffff; font-size: 0.85rem;">${doctor.roomNumber}</strong>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">STATUS</div>
                <span class="badge badge-confirmed">Confirmed</span>
              </div>
            </div>

            ${attachmentsList}
            ${rxContent}

            <div style="background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.78rem; color: #94a3b8; line-height: 1.4; margin-top: 1rem;">
              💡 <strong>Clinic Instructions:</strong> Arrive 10 minutes prior. Bring existing medication list. All meal/rest intervals are fully protected for clinical accuracy.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="print-pass-btn">🖨️ Print Pass</button>
          <button class="btn btn-primary btn-sm" id="close-pass-modal-btn-2">Done</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const closeModal = () => modal.classList.remove('active');
    modal.querySelector('#close-pass-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#close-pass-modal-btn-2').addEventListener('click', closeModal);
    modal.querySelector('#print-pass-btn').addEventListener('click', () => {
      window.print();
    });
  }

  bindEvents() {
    // Open AI Chat Button
    const chatBtn = document.getElementById('open-ai-chat-btn');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('chatbot:open'));
      });
    }

    // Open AI Voice Assistant Button
    const voiceBtn = document.getElementById('open-ai-voice-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('voice-assistant:open'));
      });
    }

    // Duration Selector Pills
    document.querySelectorAll('.duration-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.selectedDuration = parseInt(pill.dataset.duration, 10);
        this.selectedSlot = null;
        document.querySelectorAll('.duration-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const durLabel = document.getElementById('selected-duration-label');
        if (durLabel) durLabel.textContent = `${this.selectedDuration} Minutes`;
        this.renderSlots();
        this.updateFormSummary();
        notifier.showToast(`Consultation length set to ${this.selectedDuration} minutes.`, "info");
      });
    });

    // Smart Symptom Helper Chips
    document.querySelectorAll('.symptom-helper-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sym = chip.dataset.symptom;
        const pain = parseInt(chip.dataset.pain, 10) || 3;
        const symInput = document.getElementById('patient-symptoms-input');
        const slider = document.getElementById('pain-slider');
        const painDisplay = document.getElementById('pain-val-display');

        if (symInput) symInput.value = sym;
        if (slider) {
          slider.value = pain;
          this.painLevel = pain;
          if (painDisplay) painDisplay.textContent = `${pain} / 10`;
        }
        notifier.showToast("Symptom auto-filled!", "success");
      });
    });

    // Sample Attachment Buttons
    const sampleEcgBtn = document.getElementById('sample-ecg-btn');
    if (sampleEcgBtn) {
      sampleEcgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.uploadedAttachments.push({
          id: `att_${Date.now()}`,
          name: "ECG_Heart_Scan_Lead12.pdf",
          type: "application/pdf",
          previewIcon: "📊",
          uploadedAt: new Date().toLocaleDateString()
        });
        this.renderAttachmentPreviews();
        notifier.showToast("Sample ECG Report attached!", "success");
      });
    }

    const sampleSkinBtn = document.getElementById('sample-skin-btn');
    if (sampleSkinBtn) {
      sampleSkinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.uploadedAttachments.push({
          id: `att_${Date.now()}`,
          name: "Skin_Rash_Symptom_Photo.jpg",
          type: "image/jpeg",
          previewIcon: "📸",
          uploadedAt: new Date().toLocaleDateString()
        });
        this.renderAttachmentPreviews();
        notifier.showToast("Sample Skin Photo attached!", "success");
      });
    }

    // Attachment Dropzone file click
    const dropzone = document.getElementById('patient-attachment-dropzone');
    const fileInput = document.getElementById('patient-file-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(f => {
          this.uploadedAttachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: f.name,
            type: f.type,
            previewIcon: f.type.includes('image') ? '📸' : '📄',
            uploadedAt: new Date().toLocaleDateString()
          });
        });
        this.renderAttachmentPreviews();
        notifier.showToast(`${files.length} file(s) attached!`, "success");
      });
    }

    // Pain Slider
    const slider = document.getElementById('pain-slider');
    const painDisplay = document.getElementById('pain-val-display');
    const severityTag = document.getElementById('pain-severity-tag');

    if (slider) {
      slider.addEventListener('input', (e) => {
        this.painLevel = parseInt(e.target.value, 10);
        if (painDisplay) painDisplay.textContent = `${this.painLevel} / 10`;

        if (severityTag) {
          if (this.painLevel >= 7) {
            severityTag.textContent = "High / Severe";
            severityTag.style.background = "rgba(239, 68, 68, 0.2)";
            severityTag.style.color = "#f87171";
          } else if (this.painLevel >= 4) {
            severityTag.textContent = "Moderate";
            severityTag.style.background = "rgba(245, 158, 11, 0.2)";
            severityTag.style.color = "#fbbf24";
          } else {
            severityTag.textContent = "Mild";
            severityTag.style.background = "rgba(6, 182, 212, 0.15)";
            severityTag.style.color = "#38bdf8";
          }
        }
      });
    }

    // Booking Form Submit
    const form = document.getElementById('patient-booking-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!this.selectedSlot) {
          notifier.showToast("Please choose an available time slot.", "warning");
          return;
        }

        const name = document.getElementById('patient-name-input').value.trim();
        const phone = document.getElementById('patient-phone-input').value.trim();
        const age = parseInt(document.getElementById('patient-age-input').value, 10) || 30;
        const symptoms = document.getElementById('patient-symptoms-input').value.trim();

        const urgency = this.painLevel >= 7 ? "High" : this.painLevel >= 4 ? "Moderate" : "Routine";

        const newApt = {
          doctorId: this.selectedDoctorId,
          patientName: name,
          patientAge: age,
          patientPhone: phone,
          patientEmail: "patient@example.com",
          date: this.selectedDate,
          time: this.selectedSlot,
          durationMinutes: this.selectedDuration,
          symptoms: symptoms,
          painLevel: this.painLevel,
          urgency: urgency,
          attachments: [...this.uploadedAttachments],
          aiTriageNote: `Patient booked via portal (${this.selectedDuration}m visit). Symptoms: "${symptoms}". Pain: ${this.painLevel}/10 (${urgency}). ${this.uploadedAttachments.length} attachment(s) uploaded.`,
          status: "confirmed",
          bookingSource: "Patient Portal"
        };

        const saved = storage.saveAppointment(newApt);
        notifier.showToast(`Appointment ${saved.id} confirmed!`, 'success');
        this.selectedSlot = null;
        this.uploadedAttachments = [];
        form.reset();
        this.render();
        this.showDigitalPass(saved.id);
      });
    }
  }
}
