// Blessy Clinical Memory Engine: Multi-Session Patient Memory Bank & Clinical Entity Extraction (Like ChatGPT & Gemini)
import { storageService } from '../services/storageService.js';

export class BlessyMemoryEngine {
  constructor() {
    this.memoryStoragePrefix = 'healthsync_patient_memory_';
    this.inMemoryCache = new Map();
  }

  getStorageKey(userId) {
    const cleanId = userId || 'demo_patient_default';
    return `${this.memoryStoragePrefix}${cleanId}`;
  }

  // Load patient memory from storage or in-memory fallback
  getPatientMemory(userId = 'demo_patient_default') {
    const key = this.getStorageKey(userId);
    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          this.inMemoryCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {}

    const defaultMemory = {
      userId: userId || 'demo_patient_default',
      profile: {
        name: 'Alex Morgan',
        preferredLanguage: 'english',
        preferredCity: 'Indore',
        bloodGroup: null,
        age: null
      },
      chronicConditions: [],
      allergies: [],
      symptomHistory: [],
      conversationFacts: [],
      preferredDoctors: [],
      lastUpdated: new Date().toISOString()
    };

    this.inMemoryCache.set(key, defaultMemory);
    return defaultMemory;
  }

  // Persist patient memory
  savePatientMemory(userId = 'demo_patient_default', memory) {
    const key = this.getStorageKey(userId);
    memory.lastUpdated = new Date().toISOString();
    this.inMemoryCache.set(key, memory);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(memory));
      }
    } catch {}

    // Async sync to server if available
    if (typeof fetch !== 'undefined') {
      try {
        fetch('/api/patient/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, memory })
        }).catch(() => {});
      } catch {}
    }
  }

  // Extract clinical facts, chronic conditions, allergies, and location from conversational text
  extractAndStoreFacts(userId = 'demo_patient_default', text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase().trim();
    const memory = this.getPatientMemory(userId);
    let factsAdded = [];

    // 1. Chronic Conditions Extraction (Diabetes, BP, Asthma, Migraine, Arthritis, Thyroid)
    const conditionMatchers = [
      { regex: /\b(diabetes|sugar|madhumeh|डायबिटीज|शुगर)\b/i, label: 'Diabetes Mellitus' },
      { regex: /\b(bp|blood pressure|hypertension|उच्च रक्तचाप)\b/i, label: 'Hypertension (High BP)' },
      { regex: /\b(asthma|dama|दमा|अस्थमा)\b/i, label: 'Bronchial Asthma' },
      { regex: /\b(migraine|adhakapari|माइग्रेन)\b/i, label: 'Chronic Migraine' },
      { regex: /\b(arthritis|gathiya|गठिया|जोड़ों का दर्द)\b/i, label: 'Joint Arthritis' },
      { regex: /\b(thyroid|थायरॉयड)\b/i, label: 'Thyroid Disorder' }
    ];

    for (const item of conditionMatchers) {
      if (item.regex.test(lower)) {
        if (!memory.chronicConditions.includes(item.label)) {
          memory.chronicConditions.push(item.label);
          factsAdded.push(`Condition: ${item.label}`);
        }
      }
    }

    // 2. Allergies Extraction (Penicillin, Sulfa, Dust, Peanuts, Soap, Pollen)
    const allergyMatchers = [
      { regex: /\b(penicillin|पेनिसिलिन)\b/i, label: 'Penicillin' },
      { regex: /\b(sulfa|sulfur|सल्फा)\b/i, label: 'Sulfa Drugs' },
      { regex: /\b(dust|dhool|धूल)\b/i, label: 'Dust Allergy' },
      { regex: /\b(soap|detergent|साबुन)\b/i, label: 'Soap/Chemical Sensitivity' },
      { regex: /\b(pollen|parag|पराग)\b/i, label: 'Pollen Allergy' },
      { regex: /\b(peanut|mungfali|मूंगफली)\b/i, label: 'Peanuts Allergy' }
    ];

    if (lower.includes('allerg') || lower.includes('एलर्जी') || lower.includes('reaction') || lower.includes('suit nahi')) {
      for (const item of allergyMatchers) {
        if (item.regex.test(lower)) {
          if (!memory.allergies.includes(item.label)) {
            memory.allergies.push(item.label);
            factsAdded.push(`Allergy: ${item.label}`);
          }
        }
      }
    }

    // 3. Location / Preferred City Extraction
    if (lower.includes('indore') || lower.includes('इंदौर')) {
      memory.profile.preferredCity = 'Indore';
      factsAdded.push('City: Indore');
    } else if (lower.includes('mumbai') || lower.includes('मुंबई')) {
      memory.profile.preferredCity = 'Mumbai';
      factsAdded.push('City: Mumbai');
    }

    // 4. Blood Group Extraction (A+, B+, O+, AB+, O-, etc.)
    const bloodMatch = lower.match(/\b(a|b|ab|o)\s*(\+|\-|positive|negative)(?!\w)/i);
    if (bloodMatch) {
      const sign = bloodMatch[2].toLowerCase().startsWith('pos') ? '+' : (bloodMatch[2].toLowerCase().startsWith('neg') ? '-' : bloodMatch[2]);
      const bg = `${bloodMatch[1].toUpperCase()}${sign}`;
      memory.profile.bloodGroup = bg;
      factsAdded.push(`Blood Group: ${bg}`);
    }

    // 5. Preferred Doctor Mention
    if (lower.includes('ananya') || lower.includes('अनन्या')) {
      if (!memory.preferredDoctors.includes('Dr. Ananya Roy, MD')) {
        memory.preferredDoctors.push('Dr. Ananya Roy, MD');
      }
    } else if (lower.includes('patel') || lower.includes('पटेल')) {
      if (!memory.preferredDoctors.includes('Dr. Rajesh Patel, MS')) {
        memory.preferredDoctors.push('Dr. Rajesh Patel, MS');
      }
    }

    // 6. Record Symptom Event in Timeline
    const symptomKeywords = ['pain', 'dard', 'headache', 'sar dard', 'skin allergy', 'khujli', 'fever', 'bukhar', 'stomach', 'pet dard'];
    for (const sk of symptomKeywords) {
      if (lower.includes(sk)) {
        memory.symptomHistory.push({
          symptom: sk,
          rawText: text,
          date: new Date().toISOString().split('T')[0]
        });
        // Keep last 10 symptoms
        if (memory.symptomHistory.length > 10) memory.symptomHistory.shift();
        break;
      }
    }

    if (factsAdded.length > 0) {
      this.savePatientMemory(userId, memory);
    }

    return { memory, factsAdded };
  }

  // Detect if user is asking Blessy what she remembers about their health or history
  isMemoryRecallQuery(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    const recallPhrases = [
      'what do you remember', 'what do you know about me', 'what do you know about my health',
      'my medical history', 'my health history', 'what did i tell you', 'what did i say earlier',
      'remember about my health', 'do you remember my', 'my health profile',
      'meri history', 'meri medical history', 'kya yaad hai', 'mere bare me kya jante ho',
      'mere bare me kya yaad hai', 'meri pichli takleef', 'meri allergies kya hain',
      'mujhe kya bimari thi', 'meri bimari yaad hai',
      'मेरी मेडिकल हिस्ट्री', 'मेरे स्वास्थ्य के बारे में क्या जानते हो', 'मुझे क्या तकलीफ़ थी'
    ];
    return recallPhrases.some(phrase => lower.includes(phrase));
  }

  // Generate structured memory recall response (Like ChatGPT's "Memory Updated / Recalled")
  handleMemoryRecall(userId = 'demo_patient_default', text, langParam = 'english') {
    const lang = langParam === 'hindi' ? 'hindi' : (langParam === 'hinglish' ? 'hinglish' : 'english');
    const memory = this.getPatientMemory(userId);

    const conditionsStr = memory.chronicConditions.length > 0
      ? memory.chronicConditions.map(c => `• ${c}`).join('\n')
      : (lang === 'hindi' ? '• कोई पुरानी बीमारी दर्ज नहीं है' : lang === 'hinglish' ? '• Koi chronic condition recorded nahi hai' : '• None recorded');

    const allergiesStr = memory.allergies.length > 0
      ? memory.allergies.map(a => `• ⚠️ ${a}`).join('\n')
      : (lang === 'hindi' ? '• कोई ज्ञात एलर्जी दर्ज नहीं है' : lang === 'hinglish' ? '• Koi known allergy recorded nahi hai' : '• No known allergies recorded');

    const cityStr = memory.profile.preferredCity || 'Indore';
    const bgStr = memory.profile.bloodGroup ? `• **Blood Group**: ${memory.profile.bloodGroup}\n` : '';

    if (lang === 'hindi') {
      return {
        type: 'memory_recall',
        data: memory,
        message: `🧠 **ब्लेसी हेल्थ मेमोरी बैंक (Patient Clinical Profile)**:\n\nमुझे आपके स्वास्थ्य के बारे में यह जानकारी याद है:\n\n📍 **पसंदीदा शहर / अस्पताल**: ${cityStr} (हेल्थसिंक अस्पताल)\n${bgStr}🏥 **पुरानी बीमारियाँ (Chronic Conditions)**:\n${conditionsStr}\n\n🛡️ **दवा एवं अन्य एलर्जी (Allergies)**:\n${allergiesStr}\n\n👉 **क्या आप इसमें कोई नई जानकारी जोड़ना या अपडेट करना चाहते हैं?**`,
        actionChips: [
          { label: '🩺 डॉक्टर परामर्श लें', action: 'show_doctors' },
          { label: '💬 नए लक्षण बताएं', action: 'discuss_symptoms' },
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'memory_recall',
        data: memory,
        message: `🧠 **Blessy Clinical Memory Bank (Patient Health Profile)**:\n\nMujhe aapki health aur clinical history ke bare mein yeh sab details yaad hain:\n\n📍 **Preferred Location**: ${cityStr} (HealthSync Hospital)\n${bgStr}🏥 **Chronic Conditions / Bimariyan**:\n${conditionsStr}\n\n🛡️ **Allergies & Sensitivities**:\n${allergiesStr}\n\n👉 **Kya aap isme koi naya medical update ya symptom add karna chahte hain?**`,
        actionChips: [
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
          { label: '💬 Lakshan batayein', action: 'discuss_symptoms' },
          { label: '📅 Appointment book karein', action: 'book_appointment' }
        ]
      };
    }

    return {
      type: 'memory_recall',
      data: memory,
      message: `🧠 **Blessy Clinical Memory Bank (Patient Health Profile)**:\n\nHere is what I remember about your health profile and history:\n\n📍 **Preferred Facility**: ${cityStr} (HealthSync Hospital)\n${bgStr}🏥 **Chronic Conditions**:\n${conditionsStr}\n\n🛡️ **Known Allergies**:\n${allergiesStr}\n\n👉 **Would you like to update any details or discuss a new symptom?**`,
      actionChips: [
        { label: '🩺 View Doctors', action: 'show_doctors' },
        { label: '💬 Discuss Symptoms', action: 'discuss_symptoms' },
        { label: '📅 Book Appointment', action: 'book_appointment' }
      ]
    };
  }

  // Helper to format proactive contextual notes for doctor recommendations
  getProactiveContext(userId, langParam = 'english') {
    const memory = this.getPatientMemory(userId);
    let notes = [];
    if (memory.chronicConditions && memory.chronicConditions.length > 0) {
      notes.push(`history of ${memory.chronicConditions.join(', ')}`);
    }
    if (memory.allergies && memory.allergies.length > 0) {
      notes.push(`known sensitivity to ${memory.allergies.join(', ')}`);
    }
    if (notes.length === 0) return '';

    if (langParam === 'hindi') {
      return `\n\n📌 *नोट: आपके पूर्व रिकॉर्ड (${notes.join('; ')}) को ध्यान में रखते हुए।*`;
    }
    if (langParam === 'hinglish') {
      return `\n\n📌 *Note: Aapke saved medical history (${notes.join('; ')}) ko dhyan mein rakhte hue.*`;
    }
    return `\n\n📌 *Note: Incorporating your recorded health profile (${notes.join('; ')}).*`;
  }
}

export const blessyMemoryEngine = new BlessyMemoryEngine();
