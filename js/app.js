// Main Application Controller: Panel navigation, theme, sound, and initialization
import { storage } from './utils/storage.js';
import { notifier } from './utils/notifications.js';
import { PatientView } from './ui/patientView.js';
import { DoctorAdminView } from './ui/doctorAdminView.js';
import { chatbotView } from './ui/chatbotView.js';
import { voiceAssistantModal } from './ui/voiceAssistantModal.js';

class App {
  constructor() {
    this.currentRole = 'patient'; // 'patient' | 'doctor'
    this.patientView = null;
    this.doctorView = null;
  }

  init() {
    // 1. Initialize Views & AI Voice Assistant
    this.patientView = new PatientView('patient-panel-container');
    this.doctorView = new DoctorAdminView('doctor-panel-container');

    this.patientView.init();
    this.doctorView.init();
    chatbotView.init();
    voiceAssistantModal.init();

    // 2. Bind Header Navigation & Controls
    this.bindNavigation();
    this.bindHeaderControls();

    console.log("HealthSync AI Doctor-Patient Platform & Voice Assistant initialized.");
  }

  bindNavigation() {
    const patientTab = document.getElementById('role-patient-btn');
    const doctorTab = document.getElementById('role-doctor-btn');

    const patientPanel = document.getElementById('patient-panel-container');
    const doctorPanel = document.getElementById('doctor-panel-container');

    if (patientTab && doctorTab) {
      patientTab.addEventListener('click', () => {
        this.currentRole = 'patient';
        patientTab.classList.add('active');
        doctorTab.classList.remove('active');

        patientPanel.classList.add('active');
        doctorPanel.classList.remove('active');

        notifier.playSound('message');
      });

      doctorTab.addEventListener('click', () => {
        this.currentRole = 'doctor';
        doctorTab.classList.add('active');
        patientTab.classList.remove('active');

        doctorPanel.classList.add('active');
        patientPanel.classList.remove('active');

        notifier.playSound('message');
      });
    }
  }

  bindHeaderControls() {
    // Header AI Voice Assistant Launcher
    const voiceHeaderBtn = document.getElementById('header-voice-assistant-btn');
    if (voiceHeaderBtn) {
      voiceHeaderBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('voice-assistant:open'));
      });
    }

    // Sound Toggle
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const enabled = notifier.toggleSound();
        soundBtn.textContent = enabled ? '🔔' : '🔕';
        soundBtn.title = enabled ? 'Sound Effects Enabled' : 'Sound Muted';
        notifier.showToast(enabled ? 'Chime sound effects enabled' : 'Sound muted', 'info');
      });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        themeBtn.textContent = isLight ? '🌙' : '☀️';
        themeBtn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
      });
    }

    // Reset Demo Data
    const resetBtn = document.getElementById('reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Reset application to fresh demo state with default doctor routines & appointments?")) {
          storage.resetDemoData();
          notifier.showToast("Demo data reset to default clinical state.", "success");
        }
      });
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
