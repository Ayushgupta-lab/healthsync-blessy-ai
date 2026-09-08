// Doctor & Doctor PA Admin Panel View: Routine schedule, break controls, emergency surgery, vacation leaves, and appointment queue
import { storage } from '../utils/storage.js';
import { scheduleEngine, formatTime12, minutesToTime, timeToMinutes } from '../engines/scheduleEngine.js';
import { notifier } from '../utils/notifications.js';

export class DoctorAdminView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDoctorId = "doc_akhilesh"; // Default to Dr. Akhilesh Sharma, MD
    this.activeFilter = "all"; // all | today | pending | confirmed | completed
    this.activeImagePreview = null;

    this.bindStorageEvents();
  }

  bindStorageEvents() {
    storage.subscribe('doctors:changed', () => this.render());
    storage.subscribe('appointments:changed', () => this.render());
  }

  init() {
    this.render();
  }

  render() {
    if (!this.container) return;

    const doctors = storage.getDoctors();
    const currentDoctor = storage.getDoctorById(this.currentDoctorId) || doctors[0];
    if (currentDoctor && currentDoctor.id !== this.currentDoctorId) {
      this.currentDoctorId = currentDoctor.id;
    }

    const appointments = storage.getAppointmentsByDoctor(this.currentDoctorId);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(a => a.date === todayStr);
    const pendingAppointments = appointments.filter(a => a.status === 'pending_pa');
    const breaks = currentDoctor.routine?.breaks || [];
    const activeSurgery = currentDoctor.activeSurgery;
    const leaves = currentDoctor.leaves || [];
    const runningDelay = currentDoctor.runningDelayMinutes || 0;

    this.container.innerHTML = `
      <!-- Admin Header Bar -->
      <div class="admin-header-bar">
        <div class="admin-doctor-profile">
          <div class="admin-doc-avatar">${currentDoctor.avatar}</div>
          <div class="admin-doc-details">
            <h2>
              <span>${currentDoctor.name}</span>
              <span class="pa-role-badge">Doctor PA Console</span>
            </h2>
            <div style="font-size: 0.82rem; color: var(--text-secondary);">
              ${currentDoctor.title} • Room: ${currentDoctor.roomNumber}
            </div>
          </div>
        </div>

        <div class="status-control-group">
          <!-- Doctor Switcher -->
          <select class="status-dropdown" id="admin-doc-select" title="Switch Doctor Account">
            ${doctors.map(d => `
              <option value="${d.id}" ${d.id === this.currentDoctorId ? 'selected' : ''}>
                ${d.avatar} ${d.name} (${d.specialty})
              </option>
            `).join('')}
          </select>

          <!-- Real-time Status Switcher -->
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <label style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Live State:</label>
            <select class="status-dropdown" id="admin-status-select">
              <option value="available" ${currentDoctor.status === 'available' ? 'selected' : ''}>🟢 In Clinic / Available</option>
              <option value="on_break" ${currentDoctor.status === 'on_break' ? 'selected' : ''}>🥗 On Meal Break</option>
              <option value="in_consultation" ${currentDoctor.status === 'in_consultation' ? 'selected' : ''}>🩺 In Consultation</option>
              <option value="in_surgery" ${currentDoctor.status === 'in_surgery' ? 'selected' : ''}>🚨 In Emergency Surgery</option>
              <option value="off_duty" ${currentDoctor.status === 'off_duty' ? 'selected' : ''}>🌙 Off Duty / Resting</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Emergency Surgery (OT) Banner / Trigger Area -->
      ${activeSurgery ? `
        <div class="admin-surgery-alert-banner">
          <div class="surgery-alert-left">
            <div class="surgery-pulse-icon">🚨</div>
            <div>
              <div class="surgery-alert-title">EMERGENCY SURGERY (OT) IN PROGRESS</div>
              <div class="surgery-alert-desc">
                ${activeSurgery.procedureName} in <strong>${activeSurgery.otRoom || 'OT-1'}</strong> 
                (${formatTime12(activeSurgery.startTime)} – ${formatTime12(activeSurgery.endTime)}). 
                Regular patient bookings are blocked.
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-success" id="finish-surgery-btn" style="white-space: nowrap;">
            ✅ Mark Surgery Complete & Re-open Clinic
          </button>
        </div>
      ` : `
        <div class="admin-surgery-idle-bar">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.3rem;">🚨</span>
            <div>
              <strong style="font-size: 0.9rem; color: #f87171;">Acute Emergency Surgery Protocol (OT)</strong>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">
                Doctor called into unexpected surgery? Block the schedule immediately and auto-shift conflicting appointments to tomorrow.
              </div>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" id="open-surgery-modal-btn">
            🚨 Trigger Emergency Surgery Block
          </button>
        </div>
      `}

      <!-- Clinic Delay Broadcaster & KPI Metrics -->
      <div class="glass-card" style="margin-bottom: 2rem; padding: 1.25rem;">
        <div class="delay-broadcaster-wrapper">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">⏱️</span>
              <strong style="font-size: 0.95rem;">Live Clinic Running Delay Broadcast</strong>
              <span class="badge ${runningDelay > 0 ? 'badge-pending_pa' : 'badge-confirmed'}" id="current-delay-badge">
                ${runningDelay > 0 ? `+${runningDelay} min delay active` : 'On Time'}
              </span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Broadcast real-time clinic lag to all patients and Aura AI when cases take longer than expected.
            </div>
          </div>

          <div class="delay-quick-pills">
            <button class="delay-pill-btn ${runningDelay === 0 ? 'active' : ''}" data-delay="0">🟢 On Time (0m)</button>
            <button class="delay-pill-btn ${runningDelay === 15 ? 'active' : ''}" data-delay="15">⏱️ +15 Min</button>
            <button class="delay-pill-btn ${runningDelay === 30 ? 'active' : ''}" data-delay="30">⏱️ +30 Min</button>
            <button class="delay-pill-btn ${runningDelay === 45 ? 'active' : ''}" data-delay="45">⏱️ +45 Min</button>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Row -->
      <div class="kpi-metrics-grid">
        <div class="kpi-card">
          <div class="kpi-icon patients">👥</div>
          <div>
            <div class="kpi-value">${appointments.length}</div>
            <div class="kpi-label">Total Appointments (${todayAppointments.length} Today)</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon breaks">🥗</div>
          <div>
            <div class="kpi-value">${breaks.length} Protected</div>
            <div class="kpi-label">Meal & Rest Breaks</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon pending">⏳</div>
          <div>
            <div class="kpi-value">${pendingAppointments.length}</div>
            <div class="kpi-label">Pending PA Review</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon slots">🌴</div>
          <div>
            <div class="kpi-value">${leaves.length} Scheduled</div>
            <div class="kpi-label">Vacation / Out of Station</div>
          </div>
        </div>
      </div>

      <!-- Doctor Routine & Break Schedule Management -->
      <div class="glass-card routine-manager-card">
        <div class="routine-manager-header">
          <div>
            <h3>
              <span>🥗</span>
              <span>Daily Routine & Meal Breaks Management</span>
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              "Doctors need breakfast, lunch, dinner, sleep, and prep breaks too!" Schedule meal times to ensure slots remain blocked across Patient & Chatbot portals.
            </p>
          </div>

          <!-- Quick 1-Click Break Triggers -->
          <div class="quick-break-triggers">
            <button class="btn btn-secondary btn-sm" id="trigger-coffee-break-btn">
              ☕ 20m Tea Break
            </button>
            <button class="btn btn-secondary btn-sm" id="trigger-lunch-break-btn">
              🥗 Start 1h Lunch Now
            </button>
            <button class="btn btn-secondary btn-sm" id="trigger-emergency-break-btn">
              🚨 45m Urgent Rest
            </button>
          </div>
        </div>

        <!-- Editable Breaks Form -->
        <div class="breaks-config-list" id="breaks-config-container">
          <!-- Populated dynamically -->
        </div>

        <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-primary btn-sm" id="save-breaks-config-btn">
            💾 Save Routine & Sync AI Bot
          </button>
        </div>
      </div>

      <!-- Vacation / Out-of-Station Leave Manager ("Ghumne jana / Conference") -->
      <div class="glass-card" style="margin-bottom: 2.5rem;">
        <div class="routine-manager-header">
          <div>
            <h3 style="color: #c084fc;">
              <span>🌴</span>
              <span>Vacation & Conference Leave Manager ("Ghumne jana / Leaves")</span>
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Plan ahead for travel, vacations, family events, or medical summits. Patient booking calendar is automatically blacked out.
            </p>
          </div>
        </div>

        <div class="leaves-management-grid">
          <!-- Active Leaves List -->
          <div class="active-leaves-panel">
            <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">Active & Scheduled Leaves</h4>
            <div id="active-leaves-container">
              ${leaves.length === 0 ? `
                <div style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem; text-align: center; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                  No leaves scheduled. Doctor is active in clinic.
                </div>
              ` : leaves.map(l => `
                <div class="leave-item-card">
                  <div>
                    <div style="font-weight: 600; color: #e2e8f0; font-size: 0.92rem;">🌴 ${l.title}</div>
                    <div style="font-size: 0.8rem; color: #a5b4fc; margin-top: 0.2rem;">
                      📅 ${l.startDate} &rarr; ${l.endDate}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
                      Reason: ${l.reason || 'Personal Recess'}
                    </div>
                  </div>
                  <button class="btn btn-danger btn-sm remove-leave-btn" data-id="${l.id}" title="Cancel Leave">
                    🗑️ Remove
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Add Leave Form -->
          <div class="add-leave-panel">
            <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem; color: var(--text-secondary);">Schedule New Vacation / Leave</h4>
            <form id="add-leave-form" class="add-leave-form">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">Leave Title</label>
                <input type="text" class="status-dropdown" id="leave-title-input" placeholder="e.g. Family Vacation / Ghumne jana" required style="width: 100%;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">Start Date</label>
                  <input type="date" class="status-dropdown" id="leave-start-input" required style="width: 100%;">
                </div>
                <div>
                  <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">End Date</label>
                  <input type="date" class="status-dropdown" id="leave-end-input" required style="width: 100%;">
                </div>
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">Reason / Remarks</label>
                <input type="text" class="status-dropdown" id="leave-reason-input" placeholder="e.g. Travel & Annual Medical Conference" style="width: 100%;">
              </div>
              <button type="submit" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem; justify-content: center;">
                ➕ Register Leave & Block Calendar
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Appointment Queue Section -->
      <div class="glass-card">
        <div class="queue-section-header">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.25rem;">
              Patient Consultation Queue
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
              Review incoming patient bookings, triage notes, uploaded reports/images, and issue digital prescriptions.
            </p>
          </div>

          <div class="queue-tabs">
            <button class="queue-tab-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">All (${appointments.length})</button>
            <button class="queue-tab-btn ${this.activeFilter === 'pending' ? 'active' : ''}" data-filter="pending">Pending (${pendingAppointments.length})</button>
            <button class="queue-tab-btn ${this.activeFilter === 'confirmed' ? 'active' : ''}" data-filter="confirmed">Confirmed</button>
            <button class="queue-tab-btn ${this.activeFilter === 'completed' ? 'active' : ''}" data-filter="completed">Completed</button>
          </div>
        </div>

        <!-- Queue Table -->
        <div class="queue-table-wrapper">
          <table class="queue-table">
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient Details</th>
                <th>Date & Time</th>
                <th>Duration & Reports</th>
                <th>Urgency / Triage</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="queue-table-body">
              <!-- Populated dynamically -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Triage & Telehealth Inspection Modal -->
      <div id="triage-modal" class="modal-overlay"></div>

      <!-- Emergency Surgery Dispatch Modal -->
      <div id="surgery-dispatch-modal" class="modal-overlay"></div>
    `;

    this.renderBreaksConfig(currentDoctor);
    this.renderQueueTable(appointments);
    this.bindEvents();
  }

  renderBreaksConfig(doctor) {
    const container = document.getElementById('breaks-config-container');
    if (!container) return;

    const breaks = doctor.routine?.breaks || [];

    container.innerHTML = breaks.map((b, idx) => `
      <div class="break-edit-row">
        <div class="break-edit-title">
          <span>${b.icon || '☕'} <strong>${b.name}</strong></span>
          <span class="badge ${b.type === 'sleep' ? 'badge-sleep' : 'badge-break'}">${b.type}</span>
        </div>

        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.3;">
          ${b.description}
        </div>

        <div class="break-edit-time-inputs">
          <div>
            <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Start Time</label>
            <input type="time" class="break-time-input break-start-input" data-index="${idx}" value="${b.startTime}">
          </div>
          <span style="margin-top: 1rem; color: var(--text-muted);">&rarr;</span>
          <div>
            <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">End Time</label>
            <input type="time" class="break-time-input break-end-input" data-index="${idx}" value="${b.endTime}">
          </div>
        </div>
      </div>
    `).join('');
  }

  renderQueueTable(appointments) {
    const tbody = document.getElementById('queue-table-body');
    if (!tbody) return;

    let filtered = appointments;
    if (this.activeFilter === 'pending') filtered = appointments.filter(a => a.status === 'pending_pa');
    if (this.activeFilter === 'confirmed') filtered = appointments.filter(a => a.status === 'confirmed');
    if (this.activeFilter === 'completed') filtered = appointments.filter(a => a.status === 'completed');

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
            No appointments found for the selected filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(apt => {
      const hasAttachments = apt.attachments && apt.attachments.length > 0;
      const hasPrescription = !!apt.doctorPrescription;

      return `
        <tr>
          <td>
            <strong style="font-family: monospace; color: var(--accent-cyan);">${apt.id}</strong>
            ${hasPrescription ? `<div style="font-size: 0.7rem; color: #34d399; margin-top: 0.2rem;">Rx Issued ✓</div>` : ''}
          </td>
          <td>
            <div class="patient-cell-name">${apt.patientName} (${apt.patientAge || 'Adult'})</div>
            <div class="patient-cell-meta">📞 ${apt.patientPhone}</div>
          </td>
          <td>
            <div><strong>${apt.date}</strong></div>
            <div style="color: var(--accent-cyan); font-weight: 600;">${formatTime12(apt.time)}</div>
          </td>
          <td>
            <span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; font-size: 0.75rem;">
              ⏱️ ${apt.durationMinutes || 30} mins
            </span>
            ${hasAttachments ? `
              <div style="margin-top: 0.35rem;">
                <span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc; font-size: 0.72rem;">
                  📎 ${apt.attachments.length} Report(s)
                </span>
              </div>
            ` : ''}
          </td>
          <td>
            <span class="urgency-indicator ${apt.urgency || 'Routine'}">
              ${apt.urgency === 'High' ? '🔴' : apt.urgency === 'Moderate' ? '🟡' : '🔵'} ${apt.urgency || 'Routine'}
            </span>
          </td>
          <td>
            <span class="badge badge-${apt.status}">
              ${apt.status === 'confirmed' ? 'Confirmed' : apt.status === 'pending_pa' ? 'Pending' : apt.status === 'completed' ? 'Completed' : apt.status}
            </span>
          </td>
          <td>
            <div class="table-action-btns">
              <button class="btn btn-secondary btn-sm inspect-triage-btn" data-id="${apt.id}" title="Clinical Inspection & Digital Rx">
                🔍 Triage & Rx
              </button>
              ${apt.status !== 'confirmed' && apt.status !== 'completed' ? `
                <button class="btn btn-success btn-sm approve-apt-btn" data-id="${apt.id}" title="Approve Booking">
                  ✓
                </button>
              ` : apt.status === 'confirmed' ? `
                <button class="btn btn-secondary btn-sm complete-apt-btn" data-id="${apt.id}" title="Mark Consultation Completed">
                  ✅ Done
                </button>
              ` : ''}
              <button class="btn btn-danger btn-sm cancel-apt-btn" data-id="${apt.id}" title="Cancel Consultation">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    tbody.querySelectorAll('.inspect-triage-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTriageModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.approve-apt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        storage.updateAppointment(btn.dataset.id, { status: 'confirmed' });
        notifier.showToast(`Appointment ${btn.dataset.id} confirmed by Doctor PA!`, 'success');
      });
    });

    tbody.querySelectorAll('.complete-apt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        storage.updateAppointment(btn.dataset.id, { status: 'completed' });
        notifier.showToast(`Appointment ${btn.dataset.id} marked as completed.`, 'info');
      });
    });

    tbody.querySelectorAll('.cancel-apt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`Cancel appointment ${btn.dataset.id}?`)) {
          storage.updateAppointment(btn.dataset.id, { status: 'cancelled' });
          notifier.showToast(`Appointment ${btn.dataset.id} cancelled.`, 'danger');
        }
      });
    });
  }

  showTriageModal(appointmentId) {
    const modal = document.getElementById('triage-modal');
    if (!modal) return;
    const apt = storage.getAppointments().find(a => a.id === appointmentId);
    if (!apt) return;
    const doctor = storage.getDoctorById(apt.doctorId);

    const attachmentsHtml = (apt.attachments && apt.attachments.length > 0)
      ? `
        <div style="margin-bottom: 1.25rem;">
          <div style="font-size: 0.75rem; color: var(--accent-cyan); margin-bottom: 0.5rem; font-weight: 600;">
            📎 PATIENT UPLOADED REPORTS & SCANS (${apt.attachments.length})
          </div>
          <div class="doctor-modal-attachments-grid">
            ${apt.attachments.map(att => `
              <div class="doc-attachment-card">
                <div class="doc-attachment-icon">${att.previewIcon || '📄'}</div>
                <div class="doc-attachment-info">
                  <div class="doc-attachment-name" title="${att.name}">${att.name}</div>
                  <div class="doc-attachment-meta">${att.uploadedAt || 'Uploaded'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : `
        <div style="margin-bottom: 1.25rem; font-size: 0.8rem; color: var(--text-muted); background: var(--bg-surface); padding: 0.6rem; border-radius: var(--radius-sm);">
          📎 No medical reports or photos attached for this visit.
        </div>
      `;

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <h3 style="margin: 0;">Clinical Consultation Review & Prescription</h3>
            <div style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 0.2rem;">
              Appointment: ${apt.id} • ${doctor.name}
            </div>
          </div>
          <button class="toast-close" id="close-triage-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="triage-modal-grid">
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">PATIENT</div>
              <strong style="font-size: 1.05rem;">${apt.patientName} (${apt.patientAge} y/o)</strong>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">📞 ${apt.patientPhone}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">TRIAGE & DURATION</div>
              <span class="urgency-indicator ${apt.urgency || 'Routine'}">${apt.urgency || 'Routine'} Urgency</span>
              <span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #38bdf8; margin-left: 0.4rem;">
                ⏱️ ${apt.durationMinutes || 30}m
              </span>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">Pain Score: ${apt.painLevel || 0}/10</div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">PATIENT'S REPORTED SYMPTOMS</div>
            <div style="background: var(--bg-surface); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.9rem;">
              "${apt.symptoms || "No specific symptoms reported"}"
            </div>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; color: var(--accent-cyan); margin-bottom: 0.35rem;">🤖 AI CLINICAL INTAKE SUMMARY</div>
            <div class="triage-note-box">
              ${apt.aiTriageNote || "Automated symptom triage completed successfully. No immediate red flag symptoms observed."}
            </div>
          </div>

          <!-- Attachments View -->
          ${attachmentsHtml}

          <!-- Digital Prescription Composer -->
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span style="font-size: 0.75rem; color: #34d399; font-weight: 700;">🩺 OFFICIAL DIGITAL PRESCRIPTION (Rx) & CLINICAL ADVICE</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Syncs directly with Patient Digital Pass</span>
            </div>
            <textarea id="doctor-prescription-input" class="rx-textarea" rows="4" placeholder="Write prescription here (e.g. Tab Paracetamol 650mg TDS x 3 days, Tab Pantoprazole 40mg OD AC, Hydration & rest)...">${apt.doctorPrescription || "Rx:\n1. Tab Paracetamol 650mg SOS after food\n2. Tab Pantoprazole 40mg OD before breakfast x 5 days\n\nAdvice: Adequate rest, hydrate well. Follow up in 3 days if symptoms persist."}</textarea>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            Scheduled with <strong>${doctor.name}</strong> on <strong>${apt.date}</strong> at <strong>${formatTime12(apt.time)}</strong>.
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="close-triage-modal-2">Close</button>
          <button class="btn btn-primary btn-sm" id="save-prescription-btn">💾 Save & Issue Digital Rx</button>
          <button class="btn btn-success btn-sm" id="modal-approve-btn">✓ Approve Consultation</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const closeModal = () => modal.classList.remove('active');
    modal.querySelector('#close-triage-modal').addEventListener('click', closeModal);
    modal.querySelector('#close-triage-modal-2').addEventListener('click', closeModal);

    modal.querySelector('#save-prescription-btn').addEventListener('click', () => {
      const rxText = modal.querySelector('#doctor-prescription-input').value.trim();
      storage.setAppointmentPrescription(apt.id, rxText);
      notifier.showToast(`Prescription saved and issued to Patient ${apt.patientName}!`, 'success');
    });

    modal.querySelector('#modal-approve-btn').addEventListener('click', () => {
      const rxText = modal.querySelector('#doctor-prescription-input').value.trim();
      if (rxText) storage.setAppointmentPrescription(apt.id, rxText);
      storage.updateAppointment(apt.id, { status: 'confirmed' });
      notifier.showToast(`Appointment ${apt.id} approved & confirmed!`, 'success');
      closeModal();
    });
  }

  showSurgeryDispatchModal() {
    const modal = document.getElementById('surgery-dispatch-modal');
    if (!modal) return;

    const currentDoctor = storage.getDoctorById(this.currentDoctorId);
    const now = new Date();
    const nowHours = String(now.getHours()).padStart(2, '0');
    const nowMins = String(now.getMinutes()).padStart(2, '0');
    const startTimeStr = `${nowHours}:${nowMins}`;
    const defaultEndTimeStr = minutesToTime(timeToMinutes(startTimeStr) + 120); // +2 hours

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 520px;">
        <div class="modal-header">
          <div>
            <h3 style="color: #f87171; margin: 0;">🚨 Trigger Emergency Surgery (OT)</h3>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Doctor: ${currentDoctor.name}
            </div>
          </div>
          <button class="toast-close" id="close-surgery-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.85rem; color: #fca5a5; line-height: 1.4; margin-bottom: 1.25rem;">
            ⚠️ <strong>Surgery Protocol:</strong> This will block ${currentDoctor.name}'s schedule during the operation window and automatically shift conflicting outpatient appointments to tomorrow.
          </div>

          <form id="surgery-dispatch-form">
            <div style="margin-bottom: 1rem;">
              <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Procedure Name</label>
              <input type="text" class="status-dropdown" id="surgery-proc-name" value="Acute Emergency Surgery / Trauma OT" required style="width: 100%;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">OT Room / Wing</label>
                <input type="text" class="status-dropdown" id="surgery-ot-room" value="OT-1 Cardiac & Emergency" style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Duration Preset</label>
                <div style="display: flex; gap: 0.35rem;">
                  <button type="button" class="btn btn-secondary btn-sm surgery-preset-btn" data-mins="60">1h</button>
                  <button type="button" class="btn btn-secondary btn-sm surgery-preset-btn" data-mins="120" style="border-color: #f87171;">2h</button>
                  <button type="button" class="btn btn-secondary btn-sm surgery-preset-btn" data-mins="180">3h</button>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Start Time</label>
                <input type="time" class="status-dropdown" id="surgery-start-time" value="${startTimeStr}" required style="width: 100%;">
              </div>
              <div>
                <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.3rem;">Estimated End Time</label>
                <input type="time" class="status-dropdown" id="surgery-end-time" value="${defaultEndTimeStr}" required style="width: 100%;">
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm);">
              <input type="checkbox" id="surgery-autoshift-chk" checked style="accent-color: #f87171; cursor: pointer;">
              <label for="surgery-autoshift-chk" style="font-size: 0.82rem; color: #ffffff; cursor: pointer;">
                Auto-shift overlapping appointments to tomorrow at same time
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.65rem;">
              <button type="button" class="btn btn-secondary btn-sm" id="close-surgery-modal-2">Cancel</button>
              <button type="submit" class="btn btn-danger btn-sm">🚨 Dispatch Surgery Block</button>
            </div>
          </form>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const closeModal = () => modal.classList.remove('active');
    modal.querySelector('#close-surgery-modal').addEventListener('click', closeModal);
    modal.querySelector('#close-surgery-modal-2').addEventListener('click', closeModal);

    // Preset buttons
    modal.querySelectorAll('.surgery-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.mins, 10);
        const startVal = modal.querySelector('#surgery-start-time').value || startTimeStr;
        const newEnd = minutesToTime(timeToMinutes(startVal) + mins);
        modal.querySelector('#surgery-end-time').value = newEnd;
      });
    });

    // Form submit
    modal.querySelector('#surgery-dispatch-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const procedureName = modal.querySelector('#surgery-proc-name').value.trim();
      const otRoom = modal.querySelector('#surgery-ot-room').value.trim();
      const startT = modal.querySelector('#surgery-start-time').value;
      const endT = modal.querySelector('#surgery-end-time').value;
      const autoShift = modal.querySelector('#surgery-autoshift-chk').checked;

      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Save surgery block to doctor
      storage.setDoctorSurgery(this.currentDoctorId, {
        id: `surg_${Date.now()}`,
        startTime: startT,
        endTime: endT,
        procedureName,
        otRoom,
        targetDate: todayStr,
        active: true
      });

      let shiftedCount = 0;
      if (autoShift) {
        const res = scheduleEngine.shiftAppointmentsForSurgery(this.currentDoctorId, todayStr, startT, endT, tomorrowStr);
        shiftedCount = res.shiftedCount;
      }

      closeModal();
      notifier.showToast(`🚨 Emergency Surgery Block activated (${formatTime12(startT)} - ${formatTime12(endT)}). ${shiftedCount} appointment(s) shifted to tomorrow.`, 'danger');
      this.render();
    });
  }

  bindEvents() {
    // Switch doctor
    const docSelect = document.getElementById('admin-doc-select');
    if (docSelect) {
      docSelect.addEventListener('change', (e) => {
        this.currentDoctorId = e.target.value;
        this.render();
      });
    }

    // Switch live status
    const statusSelect = document.getElementById('admin-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const notes = {
          available: "Doctor is in clinic and available",
          on_break: "Doctor is on meal break to recharge",
          in_consultation: "Doctor is attending active patient",
          in_surgery: "Doctor in acute emergency surgery",
          off_duty: "Doctor is off-duty and resting"
        };
        storage.updateDoctorStatus(this.currentDoctorId, val, notes[val]);
        notifier.showToast(`Doctor status updated to: ${val.replace('_', ' ').toUpperCase()}`, 'info');
      });
    }

    // Delay broadcaster quick pills
    this.container.querySelectorAll('.delay-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delayMins = parseInt(btn.dataset.delay, 10);
        const reason = delayMins > 0 ? "Complicated clinical case taking extra time" : "";
        storage.setDoctorDelay(this.currentDoctorId, delayMins, reason);
        notifier.showToast(delayMins > 0 ? `Broadcasted +${delayMins}m running delay to patients.` : `Clinic reset to On-Time.`, delayMins > 0 ? 'warning' : 'success');
        this.render();
      });
    });

    // Surgery buttons
    const openSurgeryBtn = document.getElementById('open-surgery-modal-btn');
    if (openSurgeryBtn) {
      openSurgeryBtn.addEventListener('click', () => this.showSurgeryDispatchModal());
    }

    const finishSurgeryBtn = document.getElementById('finish-surgery-btn');
    if (finishSurgeryBtn) {
      finishSurgeryBtn.addEventListener('click', () => {
        storage.clearDoctorSurgery(this.currentDoctorId);
        notifier.showToast("Surgery completed! Doctor schedule returned to normal OPD.", "success");
        this.render();
      });
    }

    // Queue filter tabs
    this.container.querySelectorAll('.queue-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeFilter = btn.dataset.filter;
        this.render();
      });
    });

    // Save Routine & Sync
    const saveBtn = document.getElementById('save-breaks-config-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const doctor = storage.getDoctorById(this.currentDoctorId);
        const breaks = [...(doctor.routine?.breaks || [])];

        const startInputs = this.container.querySelectorAll('.break-start-input');
        const endInputs = this.container.querySelectorAll('.break-end-input');

        startInputs.forEach(input => {
          const idx = parseInt(input.dataset.index, 10);
          if (breaks[idx]) breaks[idx].startTime = input.value;
        });

        endInputs.forEach(input => {
          const idx = parseInt(input.dataset.index, 10);
          if (breaks[idx]) breaks[idx].endTime = input.value;
        });

        storage.updateDoctorBreaks(this.currentDoctorId, breaks);
        notifier.showToast("Doctor's routine updated! AI Chatbot and slots synced.", "success");
      });
    }

    // Quick Break Triggers
    const coffeeBtn = document.getElementById('trigger-coffee-break-btn');
    if (coffeeBtn) {
      coffeeBtn.addEventListener('click', () => {
        storage.updateDoctorStatus(this.currentDoctorId, 'on_break', 'Taking a 20-minute tea/refreshment break');
        notifier.showToast("20m Tea Break activated! Patient bookings temporarily paused.", "break");
      });
    }

    const lunchBtn = document.getElementById('trigger-lunch-break-btn');
    if (lunchBtn) {
      lunchBtn.addEventListener('click', () => {
        storage.updateDoctorStatus(this.currentDoctorId, 'on_break', 'Taking lunch break');
        notifier.showToast("Lunch Break activated! Slots are protected for doctor mealtime.", "break");
      });
    }

    const emergencyBtn = document.getElementById('trigger-emergency-break-btn');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', () => {
        storage.updateDoctorStatus(this.currentDoctorId, 'on_break', 'Taking an urgent rest break');
        notifier.showToast("45m Rest break active. Outpatient slots held.", "danger");
      });
    }

    // Vacation Leave Form & Removal
    const addLeaveForm = document.getElementById('add-leave-form');
    if (addLeaveForm) {
      addLeaveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('leave-title-input').value.trim();
        const startDate = document.getElementById('leave-start-input').value;
        const endDate = document.getElementById('leave-end-input').value;
        const reason = document.getElementById('leave-reason-input').value.trim();

        if (new Date(endDate) < new Date(startDate)) {
          notifier.showToast("End date cannot be earlier than start date.", "warning");
          return;
        }

        const newLeave = {
          id: `leave_${Date.now()}`,
          title,
          startDate,
          endDate,
          reason: reason || "Personal Recess / Vacation",
          type: "vacation"
        };

        storage.addDoctorLeave(this.currentDoctorId, newLeave);
        notifier.showToast(`Vacation leave scheduled (${startDate} to ${endDate})! Calendar protected.`, "success");
        addLeaveForm.reset();
        this.render();
      });
    }

    this.container.querySelectorAll('.remove-leave-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const leaveId = btn.dataset.id;
        if (confirm("Remove this scheduled leave?")) {
          storage.removeDoctorLeave(this.currentDoctorId, leaveId);
          notifier.showToast("Leave cancelled. Dates restored for booking.", "info");
          this.render();
        }
      });
    });
  }
}
