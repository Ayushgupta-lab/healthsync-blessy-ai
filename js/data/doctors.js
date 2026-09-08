// Doctors and default routine/break configurations
export const DEFAULT_DOCTORS = [
  {
    id: "doc_akhilesh",
    name: "Dr. Akhilesh Sharma, MD",
    title: "Senior Consultant Physician & Cardiologist",
    specialty: "General Medicine & Cardiology",
    experience: "15 years",
    rating: 4.96,
    reviewsCount: 450,
    avatar: "👨‍⚕️",
    badgeColor: "#0ea5e9",
    bio: "Chief Clinical Consultant with extensive expertise in cardiac health, preventive medicine, and comprehensive clinical consultations in Hindi & English.",
    consultationFee: "₹800 ($85)",
    roomNumber: "Suite 101 - Main Clinical Wing",
    status: "available",
    statusNote: "Consulting patients",
    runningDelayMinutes: 0, // In clinic on-time (or e.g. +15m, +30m)
    activeSurgery: null, // If non-null: { id, startTime, endTime, procedureName, otRoom, targetDate }
    leaves: [
      {
        id: "leave_1",
        title: "National Cardiology Summit & Personal Recess",
        startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        reason: "Medical Conference & Vacation Leave",
        type: "vacation"
      }
    ],
    routine: {
      workStart: "09:00",
      workEnd: "21:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        {
          id: "sleep_hours",
          name: "Night Sleep & Off-Hours",
          icon: "💤",
          startTime: "22:00",
          endTime: "08:00",
          type: "sleep",
          description: "Doctor is resting and off-duty. Outpatient bookings closed.",
          allowOverride: false
        },
        {
          id: "breakfast_break",
          name: "Morning Prep & Breakfast",
          icon: "🍳",
          startTime: "08:00",
          endTime: "09:00",
          type: "breakfast",
          description: "Morning chart prep, clinical reviews, and breakfast.",
          allowOverride: false
        },
        {
          id: "lunch_break",
          name: "Afternoon Lunch Break",
          icon: "🥗",
          startTime: "13:00",
          endTime: "14:00",
          type: "lunch",
          description: "Midday lunch break & recharge.",
          allowOverride: false
        },
        {
          id: "tea_break",
          name: "Evening Tea & Rest",
          icon: "☕",
          startTime: "17:00",
          endTime: "17:30",
          type: "tea",
          description: "Tea break and case discussions.",
          allowOverride: true
        },
        {
          id: "dinner_break",
          name: "Dinner Break",
          icon: "🍲",
          startTime: "20:00",
          endTime: "21:00",
          type: "dinner",
          description: "Dinner meal break before concluding evening OPD.",
          allowOverride: false
        }
      ]
    }
  },
  {
    id: "doc_1",
    name: "Dr. Marcus Vance, MD",
    title: "Chief Physician & Internal Medicine",
    specialty: "Internal Medicine",
    experience: "14 years",
    rating: 4.9,
    reviewsCount: 328,
    avatar: "👨‍⚕️",
    badgeColor: "#06b6d4",
    bio: "Specializing in preventive care, chronic disease management, and diagnostic medicine. Passionate about balanced lifestyle and patient wellness.",
    consultationFee: "$85",
    roomNumber: "Suite 304 - North Wing",
    status: "available", // available | on_break | in_consultation | off_duty
    statusNote: "Consulting patients",
    // Daily routine & human breaks schedule
    routine: {
      workStart: "08:00",
      workEnd: "22:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        {
          id: "sleep_hours",
          name: "Night Sleep & Off-Hours",
          icon: "💤",
          startTime: "22:00",
          endTime: "08:00",
          type: "sleep",
          description: "Doctor is resting and off-duty. Regular bookings closed.",
          allowOverride: false
        },
        {
          id: "breakfast_break",
          name: "Morning Prep & Breakfast",
          icon: "🍳",
          startTime: "08:00",
          endTime: "09:00",
          type: "breakfast",
          description: "Clinical prep, chart reviews, and breakfast recharge.",
          allowOverride: false
        },
        {
          id: "lunch_break",
          name: "Afternoon Lunch Break",
          icon: "🥗",
          startTime: "13:00",
          endTime: "14:00",
          type: "lunch",
          description: "Midday lunch break & energy rejuvenation.",
          allowOverride: false
        },
        {
          id: "tea_break",
          name: "Evening Tea & Rest",
          icon: "☕",
          startTime: "17:00",
          endTime: "17:30",
          type: "tea",
          description: "Short tea break and administrative paperwork.",
          allowOverride: true
        },
        {
          id: "dinner_break",
          name: "Dinner & Family Time",
          icon: "🍲",
          startTime: "20:00",
          endTime: "21:00",
          type: "dinner",
          description: "Dinner meal break before night rounds.",
          allowOverride: false
        }
      ]
    }
  },
  {
    id: "doc_2",
    name: "Dr. Sarah Jenkins, MD",
    title: "Senior Cardiologist & Heart Specialist",
    specialty: "Cardiology",
    experience: "16 years",
    rating: 4.95,
    reviewsCount: 412,
    avatar: "👩‍⚕️",
    badgeColor: "#ec4899",
    bio: "Dedicated to comprehensive cardiovascular diagnostics, heart health screening, hypertension, and post-cardiac rehabilitation.",
    consultationFee: "$120",
    roomNumber: "Suite 412 - Heart Center",
    status: "available",
    statusNote: "In clinic",
    routine: {
      workStart: "08:30",
      workEnd: "21:30",
      slotDurationMinutes: 30,
      bufferMinutes: 10,
      breaks: [
        {
          id: "sleep_hours",
          name: "Night Sleep & Off-Hours",
          icon: "💤",
          startTime: "21:30",
          endTime: "08:30",
          type: "sleep",
          description: "Off clinic hours. Emergency on-call team active.",
          allowOverride: false
        },
        {
          id: "breakfast_break",
          name: "Breakfast & Morning Rounds",
          icon: "🍳",
          startTime: "08:30",
          endTime: "09:30",
          type: "breakfast",
          description: "ICU patient rounds followed by breakfast.",
          allowOverride: false
        },
        {
          id: "lunch_break",
          name: "Executive Lunch Break",
          icon: "🥗",
          startTime: "13:30",
          endTime: "14:30",
          type: "lunch",
          description: "Doctor lunch time & ECG case reviews.",
          allowOverride: false
        },
        {
          id: "dinner_break",
          name: "Dinner Break",
          icon: "🍲",
          startTime: "19:30",
          endTime: "20:30",
          type: "dinner",
          description: "Dinner recess before evening telemetry check.",
          allowOverride: false
        }
      ]
    }
  },
  {
    id: "doc_3",
    name: "Dr. Priya Sharma, MD",
    title: "Consultant Neurologist & Sleep Specialist",
    specialty: "Neurology",
    experience: "11 years",
    rating: 4.88,
    reviewsCount: 204,
    avatar: "👩‍⚕️",
    badgeColor: "#8b5cf6",
    bio: "Expertise in migraines, neurological disorders, cognitive assessment, and sleep cycles. Passionate about circadian health.",
    consultationFee: "$110",
    roomNumber: "Suite 201 - Neuro Care",
    status: "available",
    statusNote: "Reviewing EEG scans",
    routine: {
      workStart: "09:00",
      workEnd: "21:00",
      slotDurationMinutes: 30,
      bufferMinutes: 5,
      breaks: [
        {
          id: "sleep_hours",
          name: "Circadian Sleep & Rest",
          icon: "💤",
          startTime: "21:00",
          endTime: "09:00",
          type: "sleep",
          description: "Restorative sleep cycle. Practicing circadian health.",
          allowOverride: false
        },
        {
          id: "lunch_break",
          name: "Mindful Lunch Break",
          icon: "🥗",
          startTime: "13:00",
          endTime: "14:00",
          type: "lunch",
          description: "Nutritious lunch and mental decompression.",
          allowOverride: false
        },
        {
          id: "tea_break",
          name: "Herbal Tea & Walk",
          icon: "☕",
          startTime: "16:30",
          endTime: "17:00",
          type: "tea",
          description: "Short ergonomic walking break.",
          allowOverride: true
        },
        {
          id: "dinner_break",
          name: "Evening Dinner Break",
          icon: "🍲",
          startTime: "19:30",
          endTime: "20:30",
          type: "dinner",
          description: "Dinner pause before concluding day's outpatient cases.",
          allowOverride: false
        }
      ]
    }
  }
];

export const INITIAL_APPOINTMENTS = [
  {
    id: "APT-8041",
    doctorId: "doc_1",
    patientName: "Emily Watson",
    patientAge: 32,
    patientPhone: "+1 (555) 234-5678",
    patientEmail: "emily.w@example.com",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: "10:00",
    durationMinutes: 45,
    consultationType: "detailed", // "quick_15" | "standard_30" | "detailed_45" | "complex_60"
    symptoms: "Recurring tension headaches for 5 days, mild sensitivity to bright light.",
    painLevel: 4,
    urgency: "Moderate",
    attachments: [
      {
        id: "att_1",
        name: "Head_MRI_Brain_Scan.png",
        type: "image/png",
        sender: "patient",
        previewIcon: "🧠",
        uploadedAt: new Date().toLocaleDateString()
      }
    ],
    doctorPrescription: null,
    aiTriageNote: "Patient reports tension-type cephalalgia without red flag symptoms. Uploaded Brain Scan image reviewed for neurologist review.",
    status: "confirmed", // pending_pa | confirmed | completed | cancelled | in_progress
    bookingSource: "AI Chatbot",
    createdAt: new Date().toISOString()
  },
  {
    id: "APT-8042",
    doctorId: "doc_akhilesh",
    patientName: "Robert Chen",
    patientAge: 54,
    patientPhone: "+1 (555) 890-1234",
    patientEmail: "robert.chen@example.com",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: "11:30",
    durationMinutes: 15,
    consultationType: "quick_15",
    symptoms: "Follow-up for hypertension medication adjustment and routine blood pressure check.",
    painLevel: 1,
    urgency: "Routine",
    attachments: [
      {
        id: "att_2",
        name: "Blood_Pressure_Log_7Days.pdf",
        type: "application/pdf",
        sender: "patient",
        previewIcon: "📊",
        uploadedAt: new Date().toLocaleDateString()
      }
    ],
    doctorPrescription: "Rx: Amlodipine 5mg OD, maintain daily morning BP logs. Drink 3L water.",
    aiTriageNote: "Routine follow-up for chronic hypertension. Patient uploaded 7-day home BP log. Prescription renewed.",
    status: "confirmed",
    bookingSource: "Patient Portal",
    createdAt: new Date().toISOString()
  },
  {
    id: "APT-8043",
    doctorId: "doc_akhilesh",
    patientName: "Michael Sterling",
    patientAge: 46,
    patientPhone: "+1 (555) 432-8765",
    patientEmail: "m.sterling@example.com",
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: "15:00",
    durationMinutes: 30,
    consultationType: "standard_30",
    symptoms: "Mild palpitations after aerobic jogging, occasional shortness of breath.",
    painLevel: 5,
    urgency: "High",
    aiTriageNote: "Exertional palpitations. Emergency triage confirmed no active resting angina or syncope. Recommended comprehensive ECG & Holter evaluation.",
    status: "pending_pa",
    bookingSource: "AI Chatbot",
    createdAt: new Date().toISOString()
  }
];
