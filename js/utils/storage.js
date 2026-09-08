// LocalStorage wrapper with safe in-memory fallback and reactive event bus
import { DEFAULT_DOCTORS, INITIAL_APPOINTMENTS } from '../data/doctors.js';

const STORAGE_KEYS = {
  DOCTORS: 'ai_doc_doctors_v3',
  APPOINTMENTS: 'ai_doc_appointments_v3',
  ACTIVE_PATIENT: 'ai_doc_current_patient_v3',
  SELECTED_DOCTOR: 'ai_doc_selected_doc_id_v3'
};

// Memory fallback if localStorage is unavailable
const memoryStorage = new Map();
const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
      return memoryStorage.get(key) || null;
    } catch {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: (key, val) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
      else memoryStorage.set(key, val);
    } catch {
      memoryStorage.set(key, val);
    }
  }
};

class StorageManager {
  constructor() {
    this.listeners = new Map();
    this.initDefaults();
  }

  initDefaults() {
    if (!safeStorage.getItem(STORAGE_KEYS.DOCTORS)) {
      safeStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT)) {
      const defaultPatient = {
        name: "Alex Morgan",
        age: 29,
        phone: "+1 (555) 019-2834",
        email: "alex.morgan@example.com",
        bloodGroup: "O+",
        allergies: "Penicillin",
        notes: "No chronic conditions"
      };
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(defaultPatient));
    }
  }

  // Reactive listeners
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const arr = this.listeners.get(event) || [];
      this.listeners.set(event, arr.filter(cb => cb !== callback));
    };
  }

  notify(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  // Doctors
  getDoctors() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.DOCTORS);
      return data ? JSON.parse(data) : DEFAULT_DOCTORS;
    } catch (e) {
      console.warn("Failed reading doctors from storage:", e);
      return DEFAULT_DOCTORS;
    }
  }

  getDoctorById(id) {
    const doctors = this.getDoctors();
    return doctors.find(d => d.id === id) || doctors[0];
  }

  saveDoctors(doctors) {
    safeStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    this.notify('doctors:changed', doctors);
  }

  updateDoctor(id, updates) {
    const doctors = this.getDoctors();
    const idx = doctors.findIndex(d => d.id === id);
    if (idx !== -1) {
      doctors[idx] = { ...doctors[idx], ...updates };
      this.saveDoctors(doctors);
      return doctors[idx];
    }
    return null;
  }

  updateDoctorStatus(id, status, statusNote = "") {
    return this.updateDoctor(id, { status, statusNote });
  }

  updateDoctorBreaks(id, breaks) {
    const doctor = this.getDoctorById(id);
    if (doctor) {
      const routine = { ...doctor.routine, breaks };
      return this.updateDoctor(id, { routine });
    }
    return null;
  }

  // Doctor Emergency Surgery & Operation Theatre (OT) Management
  setDoctorSurgery(doctorId, surgery) {
    // surgery: { id, startTime, endTime, procedureName, otRoom, targetDate, active }
    const doctor = this.getDoctorById(doctorId);
    if (doctor) {
      return this.updateDoctor(doctorId, { 
        activeSurgery: surgery,
        status: surgery ? 'in_surgery' : 'available',
        statusNote: surgery ? `In Emergency Surgery (${surgery.procedureName}) until ${surgery.endTime}` : 'Consulting patients'
      });
    }
    return null;
  }

  clearDoctorSurgery(doctorId) {
    return this.setDoctorSurgery(doctorId, null);
  }

  // Doctor Vacation & Personal Leaves ("Ghumne jana / Conference")
  addDoctorLeave(doctorId, leave) {
    // leave: { id, title, startDate, endDate, reason, type }
    const doctor = this.getDoctorById(doctorId);
    if (doctor) {
      const leaves = doctor.leaves ? [...doctor.leaves, leave] : [leave];
      return this.updateDoctor(doctorId, { leaves });
    }
    return null;
  }

  removeDoctorLeave(doctorId, leaveId) {
    const doctor = this.getDoctorById(doctorId);
    if (doctor && doctor.leaves) {
      const leaves = doctor.leaves.filter(l => l.id !== leaveId);
      return this.updateDoctor(doctorId, { leaves });
    }
    return null;
  }

  // Doctor Running Behind Schedule / Delay Broadcast
  setDoctorDelay(doctorId, delayMinutes, reason = "") {
    const doctor = this.getDoctorById(doctorId);
    if (doctor) {
      return this.updateDoctor(doctorId, {
        runningDelayMinutes: parseInt(delayMinutes, 10) || 0,
        delayReason: reason
      });
    }
    return null;
  }

  // Attachments (Symptom Images, Lab Reports, Digital Prescriptions)
  addAppointmentAttachment(aptId, attachment) {
    const apt = this.getAppointments().find(a => a.id === aptId);
    if (apt) {
      const attachments = apt.attachments ? [...apt.attachments, attachment] : [attachment];
      return this.updateAppointment(aptId, { attachments });
    }
    return null;
  }

  setAppointmentPrescription(aptId, prescriptionText) {
    return this.updateAppointment(aptId, { doctorPrescription: prescriptionText });
  }

  // Appointments
  getAppointments() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return data ? JSON.parse(data) : INITIAL_APPOINTMENTS;
    } catch (e) {
      console.warn("Failed reading appointments:", e);
      return INITIAL_APPOINTMENTS;
    }
  }

  getAppointmentsByDoctor(doctorId) {
    return this.getAppointments().filter(a => a.doctorId === doctorId);
  }

  saveAppointment(appointment) {
    const appointments = this.getAppointments();
    const newApt = {
      id: appointment.id || `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: appointment.status || "confirmed",
      ...appointment
    };
    appointments.unshift(newApt);
    safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    this.notify('appointments:changed', appointments);
    this.notify('appointment:created', newApt);
    return newApt;
  }

  updateAppointment(id, updates) {
    const appointments = this.getAppointments();
    const idx = appointments.findIndex(a => a.id === id);
    if (idx !== -1) {
      appointments[idx] = { ...appointments[idx], ...updates };
      safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
      this.notify('appointments:changed', appointments);
      this.notify('appointment:updated', appointments[idx]);
      return appointments[idx];
    }
    return null;
  }

  deleteAppointment(id) {
    const appointments = this.getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(filtered));
    this.notify('appointments:changed', filtered);
    return true;
  }

  // Active Patient Info
  getActivePatient() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  updateActivePatient(data) {
    safeStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(data));
    this.notify('patient:updated', data);
  }

  // Reset demo data
  resetDemoData() {
    safeStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
    safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    this.notify('doctors:changed', DEFAULT_DOCTORS);
    this.notify('appointments:changed', INITIAL_APPOINTMENTS);
  }
}

export const storage = new StorageManager();
