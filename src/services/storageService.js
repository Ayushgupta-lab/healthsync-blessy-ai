// Storage Service: Central reactive store with LocalStorage & in-memory fallback
const STORAGE_KEYS = {
  DOCTORS: 'healthsync_doctors_v4',
  APPOINTMENTS: 'healthsync_appointments_v4',
  ACTIVE_PATIENT: 'healthsync_patient_v4',
  EMERGENCIES: 'healthsync_emergencies_v4'
};

export const DEFAULT_DOCTORS = [
  {
    id: "doc_akhilesh",
    name: "Dr. Akhilesh Sharma, MD",
    title: "Chief Clinical Consultant & Cardiologist",
    specialty: "General Medicine & Cardiology",
    experience: "15+ years",
    rating: 4.96,
    reviewsCount: 450,
    avatar: "👨‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Chief Medical Consultant with extensive clinical leadership in cardiovascular medicine, preventive health, and acute outpatient care in Hindi, Hinglish & English.",
    consultationFee: "₹800 ($85)",
    feeAmount: 800,
    roomNumber: "Suite 101 - Main Clinical Wing",
    status: "available",
    statusNote: "Consulting patients in OPD",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [
      {
        id: "leave_1",
        title: "National Cardiology Summit",
        startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        reason: "Medical Conference Recess",
        type: "conference"
      }
    ],
    routine: {
      workStart: "08:30",
      workEnd: "21:30",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        {
          id: "sleep_hours",
          name: "Night Sleep & Off-Hours",
          startTime: "22:00",
          endTime: "08:30",
          type: "sleep",
          description: "Doctor rest interval. OPD closed."
        },
        {
          id: "breakfast_break",
          name: "Morning Prep & Breakfast",
          startTime: "08:30",
          endTime: "09:30",
          type: "breakfast",
          description: "Morning chart prep and breakfast."
        },
        {
          id: "lunch_break",
          name: "Lunch & Recharge",
          startTime: "13:00",
          endTime: "14:00",
          type: "lunch",
          description: "Doctor lunch break."
        },
        {
          id: "tea_break",
          name: "Evening Tea & Rest",
          startTime: "17:00",
          endTime: "17:30",
          type: "tea",
          description: "Refreshment break & case reviews."
        },
        {
          id: "dinner_break",
          name: "Dinner Break",
          startTime: "20:00",
          endTime: "21:00",
          type: "dinner",
          description: "Dinner break before night rounds."
        }
      ]
    }
  },
  {
    id: "doc_vance",
    name: "Dr. Marcus Vance, MD",
    title: "Senior Diagnostician & Internist",
    specialty: "Internal Medicine & Diagnostics",
    experience: "14 years",
    rating: 4.91,
    reviewsCount: 328,
    avatar: "👨‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Specializing in complex diagnostics, multi-system pathology, blood profile analysis, and chronic condition management.",
    consultationFee: "₹750 ($80)",
    feeAmount: 750,
    roomNumber: "Suite 204 - Diagnostic Wing",
    status: "available",
    statusNote: "Consulting patients",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [],
    routine: {
      workStart: "08:00",
      workEnd: "20:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        { id: "sleep_hours", name: "Night Sleep", startTime: "21:00", endTime: "08:00", type: "sleep", description: "Off duty" },
        { id: "lunch_break", name: "Lunch Break", startTime: "13:00", endTime: "14:00", type: "lunch", description: "Lunch" }
      ]
    }
  },
  {
    id: "doc_priya",
    name: "Dr. Priya Sharma, MD",
    title: "Consultant Neurologist",
    specialty: "Neurology & Sleep Medicine",
    experience: "12 years",
    rating: 4.94,
    reviewsCount: 290,
    avatar: "👩‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Dedicated specialist for migraine treatment, neurological disorders, cognitive health, stress physiology, and EEG telemetry.",
    consultationFee: "₹950 ($100)",
    feeAmount: 950,
    roomNumber: "Suite 302 - Neuro Care",
    status: "available",
    statusNote: "Reviewing EEG scans",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [],
    routine: {
      workStart: "09:00",
      workEnd: "21:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        { id: "sleep_hours", name: "Night Sleep", startTime: "21:30", endTime: "08:30", type: "sleep", description: "Off duty" },
        { id: "lunch_break", name: "Lunch Break", startTime: "13:30", endTime: "14:30", type: "lunch", description: "Lunch" }
      ]
    }
  },
  {
    id: "doc_patel",
    name: "Dr. Rajesh Patel, MS",
    title: "Senior Orthopedic & Joint Replacement Surgeon",
    specialty: "Orthopedics & Joint Care",
    experience: "16+ years",
    rating: 4.95,
    reviewsCount: 410,
    avatar: "👨‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Senior consultant orthopedic surgeon specializing in knee and leg pain, joint preservation, spine and sports injury recovery, and arthroscopic interventions.",
    consultationFee: "₹900 ($95)",
    feeAmount: 900,
    roomNumber: "Suite 201 - Bone & Joint Clinic",
    status: "available",
    statusNote: "Consulting outpatients in OPD",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [],
    routine: {
      workStart: "08:30",
      workEnd: "20:30",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        { id: "sleep_hours", name: "Night Sleep", startTime: "21:00", endTime: "08:30", type: "sleep", description: "Off duty" },
        { id: "lunch_break", name: "Lunch Break", startTime: "13:00", endTime: "14:00", type: "lunch", description: "Lunch" },
        { id: "tea_break", name: "Evening Tea & Rest", startTime: "17:00", endTime: "17:30", type: "tea", description: "Refreshment break" }
      ]
    }
  },
  {
    id: "doc_khan",
    name: "Dr. Sameer Khan, MD",
    title: "Senior Pulmonologist & Respiratory Specialist",
    specialty: "Pulmonology & Chest Medicine",
    experience: "13 years",
    rating: 4.92,
    reviewsCount: 280,
    avatar: "👨‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Expertise in chronic cough, asthma management, respiratory allergies, and comprehensive pulmonary rehabilitation.",
    consultationFee: "₹850 ($90)",
    feeAmount: 850,
    roomNumber: "Suite 108 - Respiratory Wing",
    status: "available",
    statusNote: "Consulting patients",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [],
    routine: {
      workStart: "09:00",
      workEnd: "20:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        { id: "sleep_hours", name: "Night Sleep", startTime: "21:00", endTime: "09:00", type: "sleep", description: "Off duty" },
        { id: "lunch_break", name: "Lunch Break", startTime: "13:00", endTime: "14:00", type: "lunch", description: "Lunch" }
      ]
    }
  },
  {
    id: "doc_ananya",
    name: "Dr. Ananya Roy, MD",
    title: "Senior Consultant Dermatologist & Cosmetologist",
    specialty: "Dermatology & Skin Care",
    experience: "11+ years",
    rating: 4.95,
    reviewsCount: 310,
    avatar: "👩‍⚕️",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face",
    badgeColor: "#0D9488",
    bio: "Specializing in clinical dermatology, skin allergies, acne, eczema, fungal infections, and aesthetic medicine.",
    consultationFee: "₹850 ($90)",
    feeAmount: 850,
    hospital: "HealthSync Super-Specialty Hospital",
    city: "Indore",
    roomNumber: "Suite 105 - Dermatology Wing",
    status: "available",
    statusNote: "Consulting patients in OPD",
    runningDelayMinutes: 0,
    activeSurgery: null,
    leaves: [],
    routine: {
      workStart: "09:00",
      workEnd: "20:30",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        { id: "sleep_hours", name: "Night Sleep", startTime: "21:00", endTime: "09:00", type: "sleep", description: "Off duty" },
        { id: "lunch_break", name: "Lunch Break", startTime: "13:00", endTime: "14:00", type: "lunch", description: "Lunch" }
      ]
    }
  }
];

export const REGISTERED_HOSPITALS = [
  {
    id: "hosp_indore",
    name: "HealthSync Super-Specialty Hospital & Research Institute",
    city: "Indore",
    address: "Vijay Nagar, AB Road, Indore, Madhya Pradesh",
    rating: 4.9,
    reviewsCount: 1240,
    specialties: ["Dermatology & Skin Care", "Cardiology", "Orthopedics & Joint Care", "General Medicine"],
    doctors: ["doc_ananya", "doc_akhilesh", "doc_patel"],
    phone: "+91 731 450-8000",
    emergencyNumber: "108 / +91 731 450-8911"
  },
  {
    id: "hosp_apex_mumbai",
    name: "HealthSync Apex Heart & Diagnostic Institute",
    city: "Mumbai",
    address: "Bandra Kurla Complex, Mumbai, Maharashtra",
    rating: 4.95,
    reviewsCount: 2100,
    specialties: ["Cardiology", "Neurology", "Internal Medicine", "Pulmonology"],
    doctors: ["doc_akhilesh", "doc_priya", "doc_vance", "doc_khan"],
    phone: "+91 22 6600-4000",
    emergencyNumber: "108 / +91 22 6600-4911"
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: "BSY-10284",
    doctorId: "doc_akhilesh",
    doctorName: "Dr. Akhilesh Sharma, MD",
    doctorSpecialty: "General Medicine & Cardiology",
    room: "Suite 101 - Main Clinical Wing",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: "10:30",
    durationMinutes: 30,
    patientName: "Alex Morgan",
    patientPhone: "+1 (555) 019-2834",
    patientAge: 29,
    bloodGroup: "O+",
    symptoms: "Mild migraine aura, occasional dizziness, blood pressure review",
    urgency: "routine",
    status: "confirmed",
    fee: "₹800 ($85)",
    createdAt: new Date().toISOString()
  },
  {
    id: "APT-8042",
    doctorId: "doc_akhilesh",
    doctorName: "Dr. Akhilesh Sharma, MD",
    doctorSpecialty: "General Medicine & Cardiology",
    room: "Suite 101 - Main Clinical Wing",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: "14:30",
    durationMinutes: 30,
    patientName: "Vikram Mehta",
    patientPhone: "+91 98765 43210",
    patientAge: 46,
    bloodGroup: "B+",
    symptoms: "Hypertension review, ECG checkup",
    urgency: "moderate",
    status: "confirmed",
    fee: "₹800 ($85)",
    createdAt: new Date().toISOString()
  }
];

const memoryStorage = new Map();
const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStorage.get(key) || null;
    } catch {
      return memoryStorage.get(key) || null;
    }
  },
  setItem: (key, val) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      } else {
        memoryStorage.set(key, val);
      }
    } catch {
      memoryStorage.set(key, val);
    }
  }
};

class StorageService {
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
        email: "alex.morgan@healthsync.io",
        bloodGroup: "O+",
        allergies: "Penicillin",
        notes: "No chronic conditions"
      };
      safeStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT, JSON.stringify(defaultPatient));
    }
  }

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
        try { cb(payload); } catch (e) { console.error(`Error notifying ${event}:`, e); }
      });
    }
  }

  getDoctors() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.DOCTORS);
      return data ? JSON.parse(data) : DEFAULT_DOCTORS;
    } catch {
      return DEFAULT_DOCTORS;
    }
  }

  getDoctorById(id) {
    const docs = this.getDoctors();
    return docs.find(d => d.id === id) || docs[0];
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

  getAppointments() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return data ? JSON.parse(data) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  }

  getAppointmentsByDoctor(doctorId) {
    return this.getAppointments().filter(a => a.doctorId === doctorId);
  }

  saveAppointment(aptData) {
    const appointments = this.getAppointments();
    const newApt = {
      id: aptData.id || `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: aptData.status || 'confirmed',
      createdAt: new Date().toISOString(),
      ...aptData
    };
    appointments.unshift(newApt);
    safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
    this.notify('appointments:changed', appointments);
    return newApt;
  }

  updateAppointment(id, updates) {
    const appointments = this.getAppointments();
    const idx = appointments.findIndex(a => a.id === id);
    if (idx !== -1) {
      appointments[idx] = { ...appointments[idx], ...updates };
      safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
      this.notify('appointments:changed', appointments);
      return appointments[idx];
    }
    return null;
  }

  getEmergencies() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.EMERGENCIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveEmergency(erRecord) {
    const emergencies = this.getEmergencies();
    emergencies.unshift(erRecord);
    safeStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(emergencies));
    this.notify('emergencies:changed', emergencies);
    this.notify('emergency:alert', erRecord);
    return erRecord;
  }

  getActivePatient() {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  getHospitals() {
    return REGISTERED_HOSPITALS;
  }

  getHospitalsByLocation(city) {
    if (!city) return REGISTERED_HOSPITALS;
    const cleanCity = String(city).toLowerCase().trim();
    return REGISTERED_HOSPITALS.filter(h =>
      h.city.toLowerCase().includes(cleanCity) ||
      cleanCity.includes(h.city.toLowerCase()) ||
      h.address.toLowerCase().includes(cleanCity)
    );
  }

  getDoctorsBySpecialty(specialty) {
    if (!specialty) return this.getDoctors();
    const clean = String(specialty).toLowerCase().trim();
    return this.getDoctors().filter(d =>
      d.specialty.toLowerCase().includes(clean) ||
      clean.includes(d.specialty.toLowerCase())
    );
  }

  resetDemoData() {
    safeStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
    safeStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
    safeStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify([]));
    this.notify('doctors:changed', DEFAULT_DOCTORS);
    this.notify('appointments:changed', INITIAL_APPOINTMENTS);
    this.notify('emergencies:changed', []);
  }
}

export const storageService = new StorageService();
