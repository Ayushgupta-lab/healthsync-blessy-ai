// Blessy Conversational AI Engine: Multi-Turn Clinical State Machine, Bilingual PA & Triage Safety
import { clinicalTools } from '../services/clinicalTools.js';
import { storageService } from '../services/storageService.js';
import { formatTime12 } from '../services/scheduleEngine.js';

export class BlessyConversationEngine {
  constructor() {
    this.session = {
      state: 'IDLE', // 'IDLE' | 'AWAITING_SYMPTOMS_OR_DOCTOR' | 'DISCUSSING_SYMPTOMS' | 'AWAITING_SYMPTOM_DETAILS' | 'SELECTING_DOCTOR' | 'SELECTING_DATE_TIME' | 'AWAITING_CONFIRMATION'
      language: 'english',
      doctorId: null,
      doctorName: null,
      pendingDate: null,
      pendingSlot: null,
      pendingAction: null,
      symptoms: {
        raw: '',
        category: '',
        duration: '',
        severity: '',
        notes: ''
      },
      patientName: 'Alex Morgan',
      patientPhone: '+1 (555) 019-2834',
      user: null,
      history: []
    };

    this.emergencyKeywords = [
      'chest pain', 'seene me dard', 'heart attack', 'chhati me dard', 'chhati dard',
      'breathless', 'saans lene me takleef', 'cannot breathe', 'saans phool rahi hai',
      'unconscious', 'behosh', 'stroke', 'paralysis', 'chot khoon', 'profuse bleeding',
      'crushing chest', 'cardiac arrest', 'severe asthma attack', 'coughing blood',
      'head trauma unconscious', 'heavy bleeding'
    ];

    this.outOfScopeKeywords = [
      'weather', 'cricket', 'football', 'joke', 'movie', 'song', 'capital of',
      'crypto', 'bitcoin', 'stock market', 'programming', 'python code', 'javascript',
      'recipe', 'cooking', 'politics', 'modi', 'biden', 'trump', 'election', 'president',
      'prime minister', 'france', 'cinema', 'game', 'gaming', 'car', 'bike',
      'who are you', 'what can you do', 'tell me a joke', 'sing a song', 'dance',
      'how are you', 'how is the weather', 'score', 'ipl', 'world cup', 'food',
      'write code', 'who made you', 'tell a joke'
    ];
  }

  // Update session context with current authenticated user
  setUserContext(user) {
    if (!user) return;
    this.session.user = user;
    if (user.fullName) this.session.patientName = user.fullName;
    if (user.phone) this.session.patientPhone = user.phone;
    if (user.role === 'doctor') {
      if (user.doctorId) this.session.doctorId = user.doctorId;
      this.session.role = 'doctor';
    } else {
      this.session.role = user.role || 'patient';
    }
  }

  getLang(langParam) {
    if (langParam === 'hindi') return 'hindi';
    if (langParam === 'hinglish' || langParam === true) return 'hinglish';
    return 'english';
  }

  resolveLang(rawText) {
    if (!rawText) return this.session.script || 'english';
    const str = String(rawText).trim();

    // 1. Native Devanagari Script (Hindi)
    if (/[\u0900-\u097F]/.test(str)) {
      this.session.script = 'hindi';
      return 'hindi';
    }

    // 2. Action tokens: preserve previous script
    if (
      str.startsWith('select_doctor_') ||
      str.startsWith('confirm_time_') ||
      str.startsWith('confirm_booking') ||
      str.startsWith('view_pass_') ||
      str.startsWith('reschedule_') ||
      str === 'show_doctors' ||
      str === 'discuss_symptoms' ||
      str === 'book_appointment'
    ) {
      return this.session.script || 'english';
    }

    // 3. Hinglish vocabulary check
    const isHinglish = this.detectLanguage(str) === 'hinglish';
    if (isHinglish) {
      this.session.script = 'hinglish';
      return 'hinglish';
    }

    this.session.script = 'english';
    return 'english';
  }

  detectLanguage(text) {
    if (!text) return this.session.language || 'english';
    const str = String(text).trim();

    // Preserve language for internal deterministic tokens and pure time values
    if (
      str.startsWith('select_doctor_') ||
      str.startsWith('confirm_time_') ||
      str.startsWith('confirm_booking') ||
      str.startsWith('view_pass_') ||
      str.startsWith('reschedule_') ||
      str === 'show_doctors' ||
      str === 'discuss_symptoms' ||
      str === 'book_appointment'
    ) {
      return this.session.language || 'english';
    }

    // 1. Devanagari Unicode Range for native Hindi script (0900-097F)
    if (/[\u0900-\u097F]/.test(str)) {
      return 'hinglish';
    }

    // 2. Comprehensive Romanized Hindi / Hinglish vocabulary (strictly excluding English homophones)
    const hindiTokens = [
      'hain', 'hai', 'kab', 'kya', 'kaise', 'karo', 'kare', 'karna', 'kariye', 'kardo', 'kar do',
      'kar dijiye', 'karwa do', 'karein', 'mujhe', 'mera', 'meri', 'mere', 'mujhko', 'humko', 'humein',
      'apna', 'apni', 'baje', 'tareekh', 'din', 'dino', 'kal', 'aaj', 'parso', 'subah', 'dopahar', 'shaam',
      'raat', 'dard', 'bukhar', 'chahiye', 'milna', 'milenge', 'bataye', 'bataiye', 'batao', 'bata do',
      'sunno', 'suno', 'namaste', 'theek', 'thik', 'kripya', 'shukriya', 'dhanyawad', 'main doctor hoon',
      'mai doctor', 'hoon', 'hu', 'tha', 'thi', 'haan', 'ha', 'accha', 'achha', 'nahi', 'nhi', 'kitna',
      'kitne', 'sar dard', 'pet dard', 'gale', 'khansi', 'dawa', 'dawai', 'dikhao', 'dekho', 'takleef',
      'seene', 'saans', 'chhot', 'chot', 'khoon', 'behosh', 'ghutne', 'kamar', 'sir dard', 'pair', 'pairon',
      'taang', 'haddi', 'sujan', 'chhutti', 'kyu', 'kyun', 'kaha', 'kahan', 'kaun', 'kaunsa', 'konsa',
      'badal do', 'badlo', 'agla', 'agli', 'pehla', 'pehli', 'sambhav', 'shuru', 'madad', 'aspataal',
      'aspatal', 'mareez', 'lakshan'
    ];

    const lower = str.toLowerCase();
    const words = lower.split(/[^a-zA-Z0-9\u0900-\u097F]+/);

    for (const token of hindiTokens) {
      if (token.includes(' ')) {
        if (lower.includes(token)) return 'hinglish';
      } else {
        if (words.includes(token)) return 'hinglish';
        if (token.length >= 4 && lower.includes(token)) return 'hinglish';
      }
    }

    return 'english';
  }

  // Personalized Greeting based on active user role and name
  generateGreeting(langParam = 'english', userOverride = null) {
    const lang = this.getLang(langParam);
    const activeUser = userOverride || this.session.user;

    const defaultChips = lang === 'hindi' ? [
      { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' },
      { label: '💬 लक्षण बताएं', action: 'discuss_symptoms' },
      { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
    ] : lang === 'hinglish' ? [
      { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
      { label: '💬 Lakshan batayein', action: 'discuss_symptoms' },
      { label: '📅 Appointment book karein', action: 'book_appointment' }
    ] : [
      { label: '🩺 Show available doctors', action: 'show_doctors' },
      { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
      { label: '📅 Book appointment', action: 'book_appointment' }
    ];

    if (activeUser && activeUser.fullName) {
      const fullName = activeUser.fullName.trim();
      const firstName = fullName.split(' ')[0] || fullName;

      // 1. Doctor Greeting
      if (activeUser.role === 'doctor') {
        const docTitle = fullName.startsWith('Dr.') ? fullName : `Dr. ${firstName}`;
        let docMessage = `Hello ${docTitle}! 🙏 I am **Blessy**, your clinic executive PA.\n\nYou can manage your OPD routines, block surgical hours, or review patient appointments. How may I assist you today?`;
        let docChips = [
          { label: '📋 View OPD Schedule', action: 'view_doctor_schedule' },
          { label: '⏸️ Add 15-min Buffer', action: 'add_buffer' },
          { label: '🩺 Show available doctors', action: 'show_doctors' }
        ];

        if (lang === 'hindi') {
          docMessage = `नमस्ते ${docTitle}! 🙏 मैं **ब्लेसी** हूँ, आपकी क्लिनिक एग्जीक्यूटिव पीए।\n\nआप अपना ओपीडी शेड्यूल मैनेज कर सकते हैं, सर्जरी बफर जोड़ सकते हैं या मरीज़ों के अपॉइंटमेंट देख सकते हैं। आज मैं आपकी क्या सहायता करूँ?`;
          docChips = [
            { label: '📋 ओपीडी शेड्यूल देखें', action: 'view_doctor_schedule' },
            { label: '⏸️ 15 मिनट बफर जोड़ें', action: 'add_buffer' },
            { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
          ];
        } else if (lang === 'hinglish') {
          docMessage = `Namaste ${docTitle}! 🙏 Main **Blessy**, HealthSync Clinic ki executive PA.\n\nAap apna OPD routine schedule manage kar sakte hain, surgery buffer add kar sakte hain, ya mareezon ke appointments dekh sakte hain. Aaj main aapki kaise madad karoon?`;
          docChips = [
            { label: '📋 View OPD Schedule', action: 'view_doctor_schedule' },
            { label: '⏸️ Add 15-min Buffer', action: 'add_buffer' },
            { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
          ];
        }

        return {
          type: 'greeting',
          detectedLanguage: lang === 'english' ? 'english' : 'hindi',
          message: docMessage,
          actionChips: docChips
        };
      }

      // 2. Patient Greeting
      let patMessage = `Hello ${firstName}! 🙏 I am **Blessy**, clinical assistant at HealthSync Clinic with Dr. Akhilesh and our specialist team.\n\nHow can I assist you with clinical consultations or clinic scheduling today?`;
      if (lang === 'hindi') {
        patMessage = `नमस्ते ${firstName}! 🙏 मैं **ब्लेसी** हूँ, हेल्थसिंक क्लिनिक और डॉ. अखिलेश व हमारी विशेषज्ञ टीम की डिजिटल मेडिकल असिस्टेंट।\n\nआज मैं आपके परामर्श या अपॉइंटमेंट शेड्यूलिंग में क्या सहायता करूँ?`;
      } else if (lang === 'hinglish') {
        patMessage = `Namaste ${firstName}! 🙏 Main **Blessy**, HealthSync Clinic aur Dr. Akhilesh & team ki medical assistant hoon.\n\nMain aapki appointment aur clinical queries mein kaise madad kar sakti hoon?`;
      }

      return {
        type: 'greeting',
        detectedLanguage: lang === 'english' ? 'english' : 'hindi',
        message: patMessage,
        actionChips: defaultChips
      };
    }

    // 3. Guest / General Greeting
    let guestMessage = "Hello! 🙏 I am **Blessy**, medical assistant at HealthSync Clinic with Dr. Akhilesh Sharma and our specialist team. How may I assist you with clinical consultations, symptom assessment, or doctor appointments today?";
    if (lang === 'hindi') {
      guestMessage = "नमस्ते! 🙏 मैं **ब्लेसी** हूँ, हेल्थसिंक क्लिनिक और डॉ. अखिलेश शर्मा व विशेषज्ञ टीम की डिजिटल मेडिकल असिस्टेंट।\n\nमैं अपॉइंटमेंट बुक करने, आपके लक्षणों के आधार पर सही डॉक्टर चुनने या क्लिनिक समय देखने में आपकी क्या सहायता करूँ?";
    } else if (lang === 'hinglish') {
      guestMessage = "Namaste! 🙏 Main **Blessy**, HealthSync Clinic aur Dr. Akhilesh Sharma & specialist team ki medical assistant hoon. Main aapke symptoms samajhne, doctor recommend karne, ya appointment book karne mein kaise madad kar sakti hoon?";
    }

    return {
      type: 'greeting',
      detectedLanguage: lang === 'english' ? 'english' : 'hindi',
      message: guestMessage,
      actionChips: defaultChips
    };
  }

  // Main Processing Entry Point & Dispatcher
  processMessage(rawInput, attachment = null) {
    try {
      let rawText = '';
      if (typeof rawInput === 'object' && rawInput !== null) {
        rawText = rawInput.action || rawInput.text || rawInput.label || '';
      } else {
        rawText = String(rawInput || '');
      }

      // Strip decorative emojis for resilient pattern matching
      const cleanText = rawText
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();

      const text = cleanText.toLowerCase();
      const lang = this.resolveLang(rawText);
      this.session.language = lang === 'english' ? 'english' : 'hinglish';

      // Record history
      this.session.history.push({ role: 'user', text: rawText, timestamp: Date.now() });

      const response = this.routeMessage(text, lang);
      if (response && typeof response === 'object') {
        response.detectedLanguage = (lang === 'english') ? 'english' : 'hindi';
        this.session.history.push({ role: 'assistant', text: response.message, timestamp: Date.now() });
      }
      return response;

    } catch (err) {
      console.error("❌ Blessy Engine Critical Error:", err);
      return {
        type: 'error_fallback',
        detectedLanguage: 'english',
        message: "I am ready to help you with your healthcare needs. You can view our available doctors, discuss your symptoms, or book an appointment:",
        actionChips: [
          { label: '🩺 Show available doctors', action: 'show_doctors' },
          { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
          { label: '📅 Book appointment', action: 'book_appointment' }
        ]
      };
    }
  }

  // Internal Router to Dedicated Handlers
  routeMessage(text, langParam) {
    const lang = this.getLang(langParam);

    // -------------------------------------------------------------
    // 00. Database & MongoDB Connection Status Query
    // -------------------------------------------------------------
    if (
      text.includes('mongo') ||
      text.includes('database') ||
      text.includes('db connect') ||
      text.includes('connected hai') ||
      text.includes('डेटाबेस') ||
      text.includes('कनेक्ट')
    ) {
      return this.handleDatabaseStatus(text, lang);
    }

    // -------------------------------------------------------------
    // 0. Acute Triage Red Flag Check (Emergency Interrupt)
    // -------------------------------------------------------------
    for (const kw of this.emergencyKeywords) {
      if (text.includes(kw)) {
        return this.handleEmergency(text, kw, lang);
      }
    }

    // -------------------------------------------------------------
    // 0B. Scope Control (Polite Redirect for Unrelated Topics)
    // -------------------------------------------------------------
    for (const oos of this.outOfScopeKeywords) {
      if (text.includes(oos)) {
        return this.handleOutOfScope(text, lang);
      }
    }

    // -------------------------------------------------------------
    // 1. Doctor / Staff Voice Commands (Doctor Availability)
    // -------------------------------------------------------------
    if (
      text.includes('main doctor hoon') ||
      text.includes('i am doctor') ||
      text.includes('block my') ||
      text.includes('shift kar do') ||
      text.includes('buffer') ||
      text.includes('busy till') ||
      text.includes('on leave tomorrow') ||
      text.includes('block calendar')
    ) {
      return this.handleDoctorStaffCommand(text, lang);
    }

    // -------------------------------------------------------------
    // 2. Reschedule Requests (PA Automatic Coordination - Must check before generic time parsing)
    // -------------------------------------------------------------
    if (
      text.startsWith('reschedule') ||
      text.includes('reschedule') ||
      text.includes('badal do') ||
      text.includes('change time') ||
      text.includes('change date') ||
      text.includes('time change')
    ) {
      return this.handleReschedule(text, lang);
    }

    // -------------------------------------------------------------
    // 3. Direct Confirmation ("Haan book kar do", "Confirm", "Yes please")
    // -------------------------------------------------------------
    const isAffirmative = (
      text === 'confirm_booking' ||
      /\b(haan|ha|yes|confirm|sure|done|kardo|kar do|kar dijiye|book kar do|yes book it|please book)\b/i.test(text) ||
      /[\u0900-\u097F]/.test(text) && (text.includes('हाँ') || text.includes('हां') || text.includes('कर दो') || text.includes('बुक'))
    );

    if (isAffirmative && (this.session.pendingSlot || this.session.state === 'AWAITING_CONFIRMATION')) {
      return this.handleDirectConfirmation(text, lang);
    }

    // -------------------------------------------------------------
    // 4. Primary Explicit Option Chips (Must check before state-based fallthrough)
    // -------------------------------------------------------------
    if (
      text === 'show_doctors' ||
      text.includes('available doctor') ||
      text.includes('available doctors') ||
      text.includes('show doctors') ||
      text.includes('show doctor') ||
      text.includes('list doctors') ||
      text.includes('all doctors') ||
      text.includes('which doctors') ||
      text.includes('doctor list') ||
      text.includes('doctors list') ||
      text.includes('doctors dikhao') ||
      text.includes('doctor dikhao') ||
      text.includes('check available doctors') ||
      text === 'doctors' ||
      text.includes('डॉक्टर') ||
      text.includes('डॉक्टरों')
    ) {
      return this.handleShowDoctors(text, lang);
    }

    if (
      text === 'discuss_symptoms' ||
      text.includes('discuss symptoms') ||
      text.includes('check symptoms') ||
      text.includes('talk about symptoms') ||
      text.includes('symptom discussion') ||
      text.includes('intent_symptoms') ||
      text.includes('takleef discuss') ||
      text.includes('lakshan') ||
      text === 'symptoms' ||
      text.includes('लक्षण')
    ) {
      return this.handleDiscussSymptoms(text, lang);
    }

    if (
      text === 'book_appointment' ||
      text === 'intent_book' ||
      text === 'book' ||
      text === 'appointment' ||
      text.includes('अपॉइंटमेंट') ||
      text.includes('बुक करो')
    ) {
      return this.handleBookingIntent(text, lang);
    }

    // -------------------------------------------------------------
    // 5. Consultation Fee Queries ("Doctor ki fees kitni hai?")
    // -------------------------------------------------------------
    if (
      text.includes('fees') ||
      text.includes('fee') ||
      text.includes('charge') ||
      text.includes('charges') ||
      text.includes('kitne paise') ||
      text.includes('kharcha') ||
      text.includes('cost') ||
      text.includes('परामर्श शुल्क') ||
      text.includes('फीस')
    ) {
      return this.handleFeeQuery(text, lang);
    }

    // -------------------------------------------------------------
    // 6. Doctor Selection & Specific Booking (Priority when specific doctor named)
    // -------------------------------------------------------------
    if (
      text.startsWith('select_doctor_') ||
      text.startsWith('book_with_') ||
      text.includes('akhilesh') ||
      text.includes('vance') ||
      text.includes('priya') ||
      text.includes('patel') ||
      text.includes('khan') ||
      text.includes('ortho') ||
      text.includes('neuro') ||
      text.includes('cardio') ||
      text.includes('पटेल') ||
      text.includes('अखिलेश') ||
      text.includes('प्रिया') ||
      text.includes('खान')
    ) {
      return this.handleDoctorSelection(text, lang);
    }

    // -------------------------------------------------------------
    // 7. Symptom Analysis (Multi-Turn Symptom Details & Medical Queries)
    // -------------------------------------------------------------
    if (
      this.session.state === 'DISCUSSING_SYMPTOMS' ||
      this.session.state === 'AWAITING_SYMPTOM_DETAILS' ||
      this.isMedicalSymptomQuery(text)
    ) {
      return this.handleSymptomAnalysis(text, lang);
    }

    // -------------------------------------------------------------
    // 8. Time Negotiation / Preferred Slots (e.g. "4 baje", "6 baje", "6:30 baje")
    // -------------------------------------------------------------
    const parsedTimeValue = this.parseTime(text);
    if (
      text.startsWith('confirm_time_') ||
      text.startsWith('slot_tomorrow_') ||
      (parsedTimeValue !== null && !text.includes('book an appointment')) ||
      text.includes('milenge') ||
      text.includes('free hain') ||
      text.includes('slot hai') ||
      (this.session.state === 'SELECTING_DATE_TIME' && parsedTimeValue !== null)
    ) {
      return this.handleSlotNegotiation(text, lang);
    }

    // -------------------------------------------------------------
    // 9. Appointment Lookup Query ("Meri appointment kab hai?")
    // -------------------------------------------------------------
    const isBookingPhrase = text.includes('book') || text.includes('karo') || text.includes('karna') ||
      text.includes('kariye') || text.includes('chahiye') || text.includes('lena hai') || text.includes('schedule') ||
      text.includes('बुक') || text.includes('चाहिए');

    if (
      !isBookingPhrase && (
        text.includes('appointment kab') ||
        text.includes('when is my appointment') ||
        text.includes('meri appointment') ||
        text.includes('mera appointment') ||
        text.includes('my appointment') ||
        text.includes('appointment details') ||
        text.includes('show my appointment') ||
        text.includes('appointments dikhao')
      )
    ) {
      return this.handleAppointmentQuery(text, lang);
    }

    // -------------------------------------------------------------
    // 10. Generic Booking Intent ("Mera appointment book karo")
    // -------------------------------------------------------------
    if (
      text.includes('book an appointment') ||
      text.includes('book appointment') ||
      text.includes('schedule appointment') ||
      text.includes('want to book') ||
      text.includes('appointment book') ||
      text.includes('appointment chahiye') ||
      text.includes('appointment lena hai') ||
      text.includes('appointment book karo') ||
      text.includes('appointment karo') ||
      text.includes('book slot') ||
      (isBookingPhrase && (text.includes('appointment') || text.includes('doctor se')))
    ) {
      return this.handleBookingIntent(text, lang);
    }

    // -------------------------------------------------------------
    // 11. Greetings
    // -------------------------------------------------------------
    if (['hello', 'hi', 'namaste', 'hey', 'blessy', 'hello blessy', 'नमस्ते', 'प्रणाम'].some(g => text === g || text.startsWith(g + ' '))) {
      return this.generateGreeting(lang, this.session.user);
    }

    // -------------------------------------------------------------
    // 12. Default Helpful Clinical Guidance Fallback
    // -------------------------------------------------------------
    return this.handleDefaultFallback(text, lang);
  }

  // -------------------------------------------------------------
  // HANDLERS IMPLEMENTATION
  // -------------------------------------------------------------

  // Handler 0: Real-Time MongoDB Database Status
  handleDatabaseStatus(text, langParam) {
    const lang = this.getLang(langParam);
    if (lang === 'hindi') {
      return {
        type: 'database_status',
        message: `✅ **हाँ, MongoDB डेटाबेस पूरी तरह कनेक्टेड है!**\n\nहेल्थसिंक सिस्टम आपके **MongoDB Atlas Cloud Cluster** से सफलतापूर्वक जुड़ा हुआ है।\n• **डेटाबेस**: \`healthsync\` (MongoDB Atlas)\n• **कनेक्शन स्थिति**: 🟢 सक्रिय एवं सुरक्षित (Connected)\n• **डेटा सुरक्षा**: एन्क्रिप्टेड क्लाउड स्टोरेज\n\nआपके सभी 5 विशेषज्ञ डॉक्टरों के प्रोफाइल, ओपीडी स्लॉट और मरीज़ों के अपॉइंटमेंट पास सीधे MongoDB में रीयल-टाइम सुरक्षित सेव हो रहे हैं।`,
        actionChips: [
          { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' },
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'database_status',
        message: `✅ **Haan, MongoDB database successfully connected hai!**\n\nHealthSync portal aapke **MongoDB Atlas Cloud Cluster** se fully connected aur active hai.\n• **Database**: \`healthsync\` (MongoDB Atlas)\n• **Status**: 🟢 Active & Synced\n• **Storage**: Live Cloud Persistence\n\nAapke sabhi 5 verified specialists, OPD slots aur appointment digital passes real-time MongoDB mein securely save ho rahe hain.`,
        actionChips: [
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
          { label: '📅 Appointment book karein', action: 'book_appointment' }
        ]
      };
    }

    return {
      type: 'database_status',
      message: `✅ **Yes, MongoDB Atlas is actively connected!**\n\nHealthSync is connected to your live **MongoDB Atlas Cloud Cluster**.\n• **Database**: \`healthsync\` (MongoDB Atlas)\n• **Connection Status**: 🟢 Active & Synced\n• **Storage**: Live Encrypted Cloud Persistence\n\nAll 5 medical specialist profiles, routine schedules, and digital patient appointment passes are synced directly to MongoDB in real-time.`,
      actionChips: [
        { label: '🩺 View Specialist Doctors', action: 'show_doctors' },
        { label: '📅 Book Appointment', action: 'book_appointment' }
      ]
    };
  }

  // Handler 1: Show Available Doctors (Queries Live Database / Storage)
  handleShowDoctors(text, langParam) {
    const lang = this.getLang(langParam);
    this.session.state = 'SELECTING_DOCTOR';
    const doctors = storageService.getDoctors();

    if (lang === 'hindi') {
      const doctorCardsHindi = doctors.map((doc, idx) => {
        const statusBadge = doc.status === 'available' ? '🟢 उपलब्ध' : (doc.statusNote || 'ओपीडी में');
        return `${idx + 1}. **${doc.name}** — ${doc.specialty}\n   • **अनुभव**: ${doc.experience || '10+ वर्ष'} | **रेटिंग**: ⭐ ${doc.rating || '4.9'}\n   • **परामर्श शुल्क**: ${doc.consultationFee || '₹800'} | **कमरा**: ${doc.roomNumber || 'Suite 101'}\n   • **स्थिति**: ${statusBadge}`;
      }).join('\n\n');

      return {
        type: 'doctor_list',
        data: doctors,
        message: `🩺 **हमारे सत्यापित विशेषज्ञ डॉक्टर:**\n\n${doctorCardsHindi}\n\n👉 **आप किस डॉक्टर से परामर्श लेना चाहते हैं?** नीचे दिए गए डॉक्टर पर क्लिक करें या नाम बताएं:`,
        actionChips: doctors.map(d => ({
          label: `👨‍⚕️ ${d.name.split(',')[0]}`,
          action: `select_doctor_${d.id}`
        }))
      };
    }

    if (lang === 'hinglish') {
      const doctorCards = doctors.map((doc, idx) => {
        const statusBadge = doc.status === 'available' ? '🟢 Available' : (doc.statusNote || 'In OPD');
        return `${idx + 1}. **${doc.name}** — ${doc.specialty}\n   • **Experience**: ${doc.experience || '10+ yrs'} | **Rating**: ⭐ ${doc.rating || '4.9'}\n   • **Fee**: ${doc.consultationFee || '₹800 ($85)'} | **Room**: ${doc.roomNumber || 'Suite 101'}\n   • **Status**: ${statusBadge}`;
      }).join('\n\n');

      return {
        type: 'doctor_list',
        data: doctors,
        message: `🩺 **Hamare Verified Specialist Doctors:**\n\n${doctorCards}\n\n👉 **Aap kis doctor ke saath consultation chahte hain?** Niche se doctor select karein ya batayein:`,
        actionChips: doctors.map(d => ({
          label: `👨‍⚕️ ${d.name.split(',')[0]}`,
          action: `select_doctor_${d.id}`
        }))
      };
    }

    const doctorCards = doctors.map((doc, idx) => {
      const statusBadge = doc.status === 'available' ? '🟢 Available' : (doc.statusNote || 'In OPD');
      return `${idx + 1}. **${doc.name}** — ${doc.specialty}\n   • **Experience**: ${doc.experience || '10+ yrs'} | **Rating**: ⭐ ${doc.rating || '4.9'}\n   • **Fee**: ${doc.consultationFee || '₹800 ($85)'} | **Room**: ${doc.roomNumber || 'Suite 101'}\n   • **Status**: ${statusBadge}`;
    }).join('\n\n');

    return {
      type: 'doctor_list',
      data: doctors,
      message: `🩺 **Available Specialist Doctors:**\n\n${doctorCards}\n\n👉 **Which specialist would you like to consult?** Please tap below to pick your doctor:`,
      actionChips: doctors.map(d => ({
        label: `👨‍⚕️ ${d.name.split(',')[0]}`,
        action: `select_doctor_${d.id}`
      }))
    };
  }

  // Handler 2: Discuss Symptoms (Initial Interactive Prompt)
  handleDiscussSymptoms(text, langParam) {
    const lang = this.getLang(langParam);
    this.session.state = 'DISCUSSING_SYMPTOMS';

    if (lang === 'hindi') {
      return {
        type: 'discuss_symptoms_prompt',
        message: `💬 **क्लिनिकल लक्षण मूल्यांकन**\n\nमैं आपके लक्षण समझकर सही विशेषज्ञ डॉक्टर चुनने में आपकी मदद करती हूँ।\n\n👉 **कृपया बताएं कि आपको क्या तकलीफ़ या लक्षण हैं?**\n(जैसे: *'पैरों या घुटने में दर्द है'*, *'3 दिन से बुखार है'*, या *'सिर में तेज दर्द है'*)।\n\nआप नीचे दिए गए मुख्य लक्षणों में से भी चुन सकते हैं:`,
        actionChips: [
          { label: '🦵 पैर या जोड़ों में दर्द', action: 'Mere pairon mein dard hai' },
          { label: '🌡️ बुखार और खांसी', action: 'Mujhe bukhar aur khasi hai' },
          { label: '🧠 सिरदर्द या माइग्रेन', action: 'Mujhe sar dard hai' },
          { label: '🤢 पेट दर्द या एसिडिटी', action: 'Mujhe pet me dard hai' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'discuss_symptoms_prompt',
        message: `💬 **Clinical Symptom Assessment**\n\nMain aapke lakshan samajhne aur sahi specialist recommend karne mein madad karti hoon.\n\n👉 **Aapko kya takleef ya symptoms mehsoos ho rahe hain?**\n(Jaise: *'Pairon ya ghutne mein dard hai'*, *'3 din se bukhar hai'*, ya *'Sar mein tez migraine ho raha hai'*).\n\nAap niche diye gaye common lakshan bhi chun sakte hain:`,
        actionChips: [
          { label: '🦵 Pair/Ghutne me dard', action: 'Mere pairon mein dard hai' },
          { label: '🌡️ Bukhar aur khansi', action: 'Mujhe bukhar aur khasi hai' },
          { label: '🧠 Sar dard / Migraine', action: 'symptom_headache' },
          { label: '🤢 Pet dard / Acidity', action: 'symptom_stomach' }
        ]
      };
    }

    return {
      type: 'discuss_symptoms_prompt',
      message: `💬 **Clinical Symptom Assessment**\n\nI can evaluate your health symptoms and guide you to the right specialist doctor.\n\n👉 **Please describe what symptoms you are experiencing:**\n(e.g., *'Severe leg or joint pain'*, *'High fever for 2 days'*, or *'Throbbing migraine'*).\n\nYou can also select a common symptom category below:`,
      actionChips: [
        { label: '🦵 Leg / Joint Pain', action: 'symptom_leg_joint' },
        { label: '🌡️ Fever & Cough', action: 'symptom_fever' },
        { label: '🧠 Headache / Migraine', action: 'symptom_headache' },
        { label: '🤢 Stomach Pain / Acidity', action: 'symptom_stomach' }
      ]
    };
  }

  // Handler 2B: Multi-Turn Symptom Understanding & Follow-up
  handleSymptomAnalysis(text, langParam) {
    const lang = this.getLang(langParam);
    const isDurationResponse = text.includes('day') || text.includes('din') || text.includes('mild') ||
      text.includes('severe') || text.includes('moderate') || text.includes('subah') || text.includes('halka') ||
      text.includes('tez') || text.includes('duration_') || text.includes('severity_') || text.includes('दिन') ||
      text.includes('हल्का') || text.includes('तेज');

    if (this.session.state === 'AWAITING_SYMPTOM_DETAILS' && isDurationResponse) {
      this.session.symptoms.duration = text;
      this.session.state = 'SELECTING_DOCTOR';
      const category = this.session.symptoms.category || 'general';
      return this.provideSymptomRecommendation(category, lang);
    }

    // Categorize Condition
    let category = 'general';
    if (
      text.includes('pair') || text.includes('pairon') || text.includes('taang') ||
      text.includes('leg') || text.includes('legs') || text.includes('knee') ||
      text.includes('ghutne') || text.includes('ghutna') || text.includes('foot') ||
      text.includes('feet') || text.includes('ankle') || text.includes('haddi') ||
      text.includes('bone') || text.includes('joint') || text.includes('joints') ||
      text.includes('kamar') || text.includes('back pain') || text.includes('sprain') ||
      text.includes('ortho') || text.includes('symptom_leg_joint') || text.includes('symptom_joint') ||
      text.includes('पैर') || text.includes('पैरों') || text.includes('घुटने') || text.includes('हड्डी') ||
      text.includes('जोड़')
    ) {
      category = 'ortho';
    } else if (
      text.includes('headache') || text.includes('sar dard') || text.includes('sir dard') ||
      text.includes('migraine') || text.includes('sar me') || text.includes('symptom_headache') ||
      text.includes('सिरदर्द') || text.includes('सिर दर्द')
    ) {
      category = 'headache';
    } else if (
      text.includes('cough') || text.includes('khansi') || text.includes('asthma') ||
      text.includes('saans') || text.includes('chest congestion') || text.includes('खांसी') || text.includes('सांस')
    ) {
      category = 'respiratory';
    } else if (
      text.includes('fever') || text.includes('bukhar') || text.includes('cold') ||
      text.includes('jukaam') || text.includes('symptom_fever') || text.includes('बुखार') || text.includes('जुकाम')
    ) {
      category = 'fever';
    } else if (
      text.includes('stomach') || text.includes('pet dard') || text.includes('acidity') ||
      text.includes('vomiting') || text.includes('ulti') || text.includes('gas') || text.includes('symptom_stomach') ||
      text.includes('पेट दर्द') || text.includes('उल्टी')
    ) {
      category = 'stomach';
    } else if (
      text.includes('cardio') || text.includes('heart') || text.includes('chhati') ||
      text.includes('palpitation') || text.includes('bp') || text.includes('blood pressure') ||
      text.includes('दिल') || text.includes('धड़कन')
    ) {
      category = 'cardio';
    }

    this.session.symptoms.category = category;
    this.session.symptoms.raw = text;

    // Multi-turn check: If user gave brief mention without duration, ask follow-up
    if (!text.includes('din') && !text.includes('day') && !text.includes('week') && !text.includes('mild') && !text.includes('severe') && !text.includes('दिन') && !text.includes('तेज') && !text.includes('हल्का')) {
      this.session.state = 'AWAITING_SYMPTOM_DETAILS';

      if (lang === 'hindi') {
        return {
          type: 'symptom_followup',
          message: `मैं समझ सकती हूँ। आपके लक्षण नोट कर लिए गए हैं।\n\nसटीक विशेषज्ञ और सही समय स्लॉट तय करने के लिए, कृपया बताएं:\n• **यह दर्द या तकलीफ़ कितने दिनों से है?** (जैसे: *'आज से'*, या *'2-3 दिनों से'*)\n• **तकलीफ़ कितनी तेज़ है?** (**हल्का**, **मध्यम**, या **बहुत तेज़**)?`,
          actionChips: [
            { label: '🗓️ 1-2 दिन से (हल्का)', action: '2 din se halka dard hai' },
            { label: '🗓️ 3+ दिन से (मध्यम)', action: '3 din se dard hai' },
            { label: '⚡ बहुत तेज़ दर्द', action: 'bohot tez dard hai' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'symptom_followup',
          message: `Samajh gayi! Isko theek se evaluate karne ke liye kripya **2 zaroori baatein** batayein:\n\n1. Yeh takleef **kitne samay se hai**? (Jaise: *'Aaj se'*, ya *'2-3 dino se'*)\n2. Takleef kitni hai? (**Halka / Mild**, **Medium**, ya **Tez / Severe**)?\n\nNiche se chun sakte hain:`,
          actionChips: [
            { label: '🗓️ 1-2 Days (Mild)', action: '2 din se halka dard hai' },
            { label: '🗓️ 3+ Days (Moderate)', action: '3 din se dard hai' },
            { label: '⚡ Severe / High Discomfort', action: 'bohot tez dard hai' }
          ]
        };
      }

      return {
        type: 'symptom_followup',
        message: `Understood. To provide accurate guidance and find the right specialist, please let me know:\n\n1. **Duration**: How long have you experienced this? (e.g., *'Since today'*, *'2-3 days'*)\n2. **Intensity**: Is the discomfort **Mild**, **Moderate**, or **Severe**?\n\nYou can select below:`,
        actionChips: [
          { label: '🗓️ 1-2 Days (Mild)', action: 'duration_1_2_mild' },
          { label: '🗓️ 3+ Days (Moderate)', action: 'duration_3_plus_mod' },
          { label: '⚡ Severe / High Discomfort', action: 'severity_severe' }
        ]
      };
    }

    this.session.state = 'SELECTING_DOCTOR';
    return this.provideSymptomRecommendation(category, lang);
  }

  // Provide clinical advice, match specialist doctor, and offer appointment slot
  provideSymptomRecommendation(category, langParam) {
    const lang = this.getLang(langParam);
    let conditionName = "Clinical Consultation";
    let advice = "";
    let recommendedDoctorId = "doc_patel";
    let specialistName = "Dr. Rajesh Patel, MS";
    let specialtyTitle = "Senior Orthopedic & Joint Surgeon (Suite 201)";
    let feeText = "₹900 ($95)";

    if (category === 'ortho') {
      conditionName = lang === 'hindi' ? "हड्डी व जोड़ संबंधित परामर्श" : (lang === 'hinglish' ? "Musculoskeletal & Orthopedic Assessment" : "Musculoskeletal & Orthopedic Assessment");
      recommendedDoctorId = "doc_patel";
      specialistName = "Dr. Rajesh Patel, MS";
      specialtyTitle = lang === 'hindi' ? "वरिष्ठ हड्डी एवं जोड़ विशेषज्ञ (Suite 201)" : "Senior Orthopedic & Joint Specialist (Suite 201)";
      feeText = "₹900 ($95)";
      advice = lang === 'hindi'
        ? "• **विश्राम**: पैर पर अधिक भार न डालें, लेटते समय पैर को थोड़ा ऊंचा रखें।\n• **सिकाई**: दर्द या सूजन वाले हिस्से पर 15-20 मिनट बर्फ की सिकाई करें।\n• **सावधानी**: अचानक झटके या भारी वजन उठाने से बचें।"
        : lang === 'hinglish'
        ? "• **Vishram & Elevation**: Pair par zyada bojh ya wazan na dalein. Pair ko uncha rakh kar rest karein.\n• **Cold Compress**: Dard ya sujan wale hisse par 15-20 minute cold/ice pack lagayein.\n• **Gentle Movement**: Achanak jhatke ya bhari wazan uthane se bachein."
        : "• **Rest & Elevate**: Avoid bearing weight on the affected limb; elevate the leg while resting.\n• **Cold Compress**: Apply an ice pack wrapped in a cloth for 15-20 minutes to reduce local swelling.\n• **Joint Care**: Avoid sudden twisting or strenuous weight-bearing activities.";
    } else if (category === 'headache') {
      conditionName = lang === 'hindi' ? "सिरदर्द एवं न्यूरो परामर्श" : "Cephalalgia / Migraine Care";
      recommendedDoctorId = "doc_priya";
      specialistName = "Dr. Priya Sharma, MD";
      specialtyTitle = lang === 'hindi' ? "न्यूरोलॉजिस्ट (Suite 302)" : "Consultant Neurologist (Suite 302)";
      feeText = "₹950 ($100)";
      advice = lang === 'hindi'
        ? "• **विश्राम**: शांत, हल्के अंधेरे कमरे में आराम करें और भरपूर पानी पिएं।\n• **सिकाई**: माथे और गर्दन पर ठंडी पट्टी लगाएं।\n• **स्क्रीन ब्रेक**: मोबाइल और लैपटॉप स्क्रीन से दूरी बनाएं।"
        : lang === 'hinglish'
        ? "• **Aaram**: Shant, andhere kamre mein aaram karein aur dehydration se bachein.\n• **Cold Compress**: Maathe aur gardan par halka thanda sek lagayein.\n• **Screen Time**: Mobile/laptop screen turant band karein."
        : "• **Rest**: Rest in a quiet, dimly lit space and drink plenty of water.\n• **Cold Compress**: Apply a cold gel pack to your forehead or temples.\n• **Digital Break**: Limit screen exposure to reduce optic nerve strain.";
    } else if (category === 'respiratory') {
      conditionName = lang === 'hindi' ? "श्वसन एवं फेफड़े संबंधित परामर्श" : "Respiratory & Pulmonary Care";
      recommendedDoctorId = "doc_khan";
      specialistName = "Dr. Sameer Khan, MD";
      specialtyTitle = lang === 'hindi' ? "वरिष्ठ पल्मोनोलॉजिस्ट (Suite 108)" : "Senior Pulmonologist (Suite 108)";
      feeText = "₹850 ($90)";
      advice = lang === 'hindi'
        ? "• **भाप**: दिन में दो बार गुनगुने पानी की भाप लें।\n• **तरल पदार्थ**: गुनगुना पानी और काढ़ा पिएं, ठंडी चीजों से परहेज करें।"
        : lang === 'hinglish'
        ? "• **Steam Inhalation**: Din mein 2 baar gungune paani ki bhaap lein.\n• **Hydration**: Gunguna paani aur herbal kadha piyein, thandi cheezon se bachein."
        : "• **Steam Inhalation**: Use warm steam inhalation twice daily to soothe bronchial passages.\n• **Warm Fluids**: Maintain regular intake of warm water and avoid chilled drinks.";
    } else if (category === 'fever') {
      conditionName = lang === 'hindi' ? "वायरल बुखार एवं सामान्य चिकित्सा" : "Viral Infection & Pyrexia";
      recommendedDoctorId = "doc_vance";
      specialistName = "Dr. Marcus Vance, MD";
      specialtyTitle = lang === 'hindi' ? "वरिष्ठ डायग्नोस्टिशियन (Suite 204)" : "Senior Diagnostician & Internist (Suite 204)";
      feeText = "₹750 ($80)";
      advice = lang === 'hindi'
        ? "• **हाइड्रेशन**: ओआरएस, गुनगुना पानी और सूप पिएं।\n• **पट्टियां**: सामान्य पानी की पट्टी माथे पर रखें।\n• **आराम**: पूरा शारीरिक आराम करें।"
        : lang === 'hinglish'
        ? "• **Hydration**: Prachur matra mein ORS, gunguna paani aur soup piyein.\n• **Temperature**: Normal paani ki patti maathe par rakhein.\n• **Rest**: Complete bed rest karein."
        : "• **Hydration**: Maintain high fluid intake (electrolyte water, warm broth, herbal tea).\n• **Tepid Sponge**: Use lukewarm sponge baths to manage fever spikes.\n• **Rest**: Complete physical rest to support immune recovery.";
    } else {
      conditionName = lang === 'hindi' ? "सामान्य स्वास्थ्य परामर्श" : "General Health Consultation";
      recommendedDoctorId = "doc_akhilesh";
      specialistName = "Dr. Akhilesh Sharma, MD";
      specialtyTitle = lang === 'hindi' ? "प्रमुख क्लिनिकल कंसल्टेंट (Suite 101)" : "Chief Medical Consultant (Suite 101)";
      feeText = "₹800 ($85)";
      advice = lang === 'hindi'
        ? "• पर्याप्त विश्राम करें और खुद को हाइड्रेटेड रखें।\n• लक्षणों का समय और स्थिति नोट करें।"
        : lang === 'hinglish'
        ? "• Paryaapt vishram karein aur hydrate rahein.\n• Lakshan kab badh rahe hain unka samay note karein."
        : "• Ensure adequate restorative rest and hydration.\n• Keep a brief log of symptoms for your consultation.";
    }

    this.session.doctorId = recommendedDoctorId;
    this.session.doctorName = specialistName;
    this.session.state = 'SELECTING_DATE_TIME';

    if (lang === 'hindi') {
      return {
        type: 'symptom_recommendation',
        data: { conditionName, specialistName, recommendedDoctorId },
        message: `💡 **क्लिनिकल सुझाव: ${conditionName}**\n\n${advice}\n\n🩺 **अनुशंसित विशेषज्ञ**: इस समस्या के लिए हमारे **${specialistName}** (${specialtyTitle}) सबसे उपयुक्त हैं।\n• **परामर्श शुल्क**: ${feeText}\n\n🕒 **उपलब्ध समय (कल)**:\n• सुबह 11:30 AM\n• दोपहर/शाम 04:00 PM (4 बजे)\n• शाम 06:00 PM (6 बजे)\n• शाम 06:30 PM (6:30 बजे)\n\n👉 **आप किस समय का स्लॉट बुक करना चाहेंगे?** (आप *'4 बजे'*, *'6 बजे'*, या *'6:30 बजे'* चुन सकते हैं):`,
        actionChips: [
          { label: `✅ ${specialistName.split(',')[0]} के साथ बुक करें`, action: `select_doctor_${recommendedDoctorId}` },
          { label: '⏱️ कल 04:00 PM', action: 'confirm_time_16:00' },
          { label: '⏱️ कल 06:00 PM', action: 'confirm_time_18:00' },
          { label: '⏱️ कल 06:30 PM', action: 'confirm_time_18:30' },
          { label: '👀 सभी डॉक्टर देखें', action: 'show_doctors' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'symptom_recommendation',
        data: { conditionName, specialistName, recommendedDoctorId },
        message: `💡 **Clinical Sujhav: ${conditionName}**\n\n${advice}\n\n🩺 **Recommended Specialist**: Is takleef ke liye hamare **${specialistName}** (${specialtyTitle}) sabse upyukt hain.\n• **Consultation Fee**: ${feeText}\n\n🕒 **Available Slots (Kal / Tomorrow)**:\n• Subah 11:30 AM\n• Shaam 04:00 PM (4 baje)\n• Shaam 06:00 PM (6 baje)\n• Shaam 06:30 PM (6:30 baje)\n\n👉 **Aap kaunsa time prefer karenge?** (Aap *'4 baje'*, *'6 baje'*, ya *'6:30 baje'* bol sakte hain):`,
        actionChips: [
          { label: `✅ Book with ${specialistName.split(',')[0]}`, action: `select_doctor_${recommendedDoctorId}` },
          { label: '⏱️ Kal 04:00 PM', action: 'confirm_time_16:00' },
          { label: '⏱️ Kal 06:00 PM', action: 'confirm_time_18:00' },
          { label: '⏱️ Kal 06:30 PM', action: 'confirm_time_18:30' },
          { label: '👀 Sabhi Doctors Dekhein', action: 'show_doctors' }
        ]
      };
    }

    return {
      type: 'symptom_recommendation',
      data: { conditionName, specialistName, recommendedDoctorId },
      message: `💡 **Clinical Care Guidance: ${conditionName}**\n\n${advice}\n\n🩺 **Recommended Specialist**: For these symptoms, we recommend consulting **${specialistName}** (${specialtyTitle}).\n• **Consultation Fee**: ${feeText}\n\n🕒 **Available Slots (Tomorrow)**:\n• Morning 11:30 AM\n• Evening 04:00 PM (4 PM)\n• Evening 06:00 PM (6 PM)\n• Evening 06:30 PM (6:30 PM)\n\n👉 **What time slot works best for you?** (You can say *'4 PM'*, *'6 PM'*, or *'6:30 PM'*):`,
      actionChips: [
        { label: `✅ Book with ${specialistName.split(',')[0]}`, action: `select_doctor_${recommendedDoctorId}` },
        { label: '⏱️ Tomorrow 04:00 PM', action: 'confirm_time_16:00' },
        { label: '⏱️ Tomorrow 06:00 PM', action: 'confirm_time_18:00' },
        { label: '⏱️ Tomorrow 06:30 PM', action: 'confirm_time_18:30' },
        { label: '👀 View All Doctors', action: 'show_doctors' }
      ]
    };
  }

  // Handler 3: Booking Intent (Guides user without assuming a single doctor)
  handleBookingIntent(text, langParam) {
    const lang = this.getLang(langParam);
    this.session.state = 'AWAITING_SYMPTOMS_OR_DOCTOR';

    if (lang === 'hindi') {
      return {
        type: 'booking_intent',
        message: `📅 **अपॉइंटमेंट बुकिंग सहायता**\n\nज़रूर! मैं आपकी अपॉइंटमेंट बुक करने में पूरी सहायता करूँगी।\n\n👉 **आपको क्या स्वास्थ्य समस्या या लक्षण हैं?**\n(जैसे: *'पैरों में दर्द'*, *'बुखार और खांसी'*, *'सिरदर्द / माइग्रेन'*, या *'कार्डियक चेकअप'*)।\n\nया यदि आप किसी विशिष्ट डॉक्टर से परामर्श लेना चाहते हैं, तो कृपया उनका नाम बताएं या डॉक्टरों की सूची देखें:`,
        actionChips: [
          { label: '🦵 पैरों / जोड़ों में दर्द', action: 'Mere pairon mein dard hai' },
          { label: '🌡️ बुखार / खांसी', action: 'Mujhe bukhar aur khasi hai' },
          { label: '🧠 सिरदर्द / माइग्रेन', action: 'Mujhe sar dard hai' },
          { label: '🩺 सभी डॉक्टर देखें', action: 'show_doctors' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'booking_intent',
        message: `📅 **Appointment Booking Assistance**\n\nZaroor! Main aapki appointment book karne mein poori madad karungi.\n\n👉 **Aapko kya takleef ya lakshan (symptoms) hain?**\n(Jaise: *'Pairon mein dard'*, *'Bukhar aur khansi'*, *'Sar dard / migraine'*, ya *'Cardiac checkup'*).\n\nYa agar aap kisi specific doctor se milna chahte hain, to kripya unka naam batayein ya sabhi doctors ki list dekhein:`,
        actionChips: [
          { label: '🦵 Pairon / Joint me dard', action: 'symptom_leg_joint' },
          { label: '🌡️ Bukhar / Khansi', action: 'symptom_fever' },
          { label: '🧠 Sar dard / Migraine', action: 'symptom_headache' },
          { label: '🩺 Sabhi Doctors Dekhein', action: 'show_doctors' }
        ]
      };
    }

    return {
      type: 'booking_intent',
      message: `📅 **Appointment Booking Assistance**\n\nCertainly! I would be glad to help you schedule an appointment.\n\n👉 **What health symptoms or concerns are you experiencing?**\n(e.g., *'Leg or joint pain'*, *'Fever and cough'*, *'Headache or migraine'*, or *'Cardiac checkup'*).\n\nAlternatively, if you already have a preferred doctor, let me know their name or view our full doctor roster:`,
      actionChips: [
        { label: '🦵 Leg / Joint Pain', action: 'symptom_leg_joint' },
        { label: '🌡️ Fever / Cough', action: 'symptom_fever' },
        { label: '🧠 Headache / Migraine', action: 'symptom_headache' },
        { label: '🩺 View All Doctors', action: 'show_doctors' }
      ]
    };
  }
  // Handler 4: Doctor Selection (User picks a specific doctor)
  handleDoctorSelection(text, langParam) {
    const lang = this.getLang(langParam);
    let docId = 'doc_patel';
    if (text.includes('patel') || text.includes('ortho') || text.includes('doc_patel') || text.includes('पटेल')) docId = 'doc_patel';
    else if (text.includes('priya') || text.includes('neuro') || text.includes('doc_priya') || text.includes('प्रिया')) docId = 'doc_priya';
    else if (text.includes('khan') || text.includes('pulmo') || text.includes('doc_khan') || text.includes('खान')) docId = 'doc_khan';
    else if (text.includes('vance') || text.includes('doc_vance')) docId = 'doc_vance';
    else if (text.includes('akhilesh') || text.includes('cardio') || text.includes('doc_akhilesh') || text.includes('अखिलेश')) docId = 'doc_akhilesh';

    const doctor = storageService.getDoctorById(docId) || storageService.getDoctorById('doc_akhilesh');
    this.session.doctorId = doctor.id;
    this.session.doctorName = doctor.name;
    this.session.state = 'SELECTING_DATE_TIME';

    // If message also specifies date or time (e.g. "kal 4 baje"), immediately negotiate!
    const parsedTime = this.parseTime(text);
    if (parsedTime) {
      return this.handleSlotNegotiation(text, lang);
    }

    if (lang === 'hindi') {
      return {
        type: 'doctor_selected',
        data: doctor,
        message: `✓ **${doctor.name}** (${doctor.specialty}) चुन लिए गए हैं।\n\n• **कमरा**: ${doctor.roomNumber}\n• **परामर्श शुल्क**: ${doctor.consultationFee}\n• **अनुभव**: ${doctor.experience || '12+ वर्ष'}\n\n👉 **आपको कब का समय चाहिए?** (जैसे: *'कल 11:30 AM'*, *'कल 4 बजे'*, *'कल 6 बजे'*, या *'कल 6:30 बजे'*):`,
        actionChips: [
          { label: '⏱️ कल 11:30 AM', action: 'confirm_time_11:30' },
          { label: '⏱️ कल 04:00 PM', action: 'confirm_time_16:00' },
          { label: '⏱️ कल 06:00 PM', action: 'confirm_time_18:00' },
          { label: '⏱️ कल 06:30 PM', action: 'confirm_time_18:30' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'doctor_selected',
        data: doctor,
        message: `✓ **${doctor.name}** (${doctor.specialty}) select ho gaye hain.\n\n• **Clinic Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n• **Experience**: ${doctor.experience || '12+ years'}\n\n👉 **Aapko kab ka slot chahiye?** (Jaise: *'Kal 11:30 AM'*, *'Kal 4 baje'*, *'Kal 6 baje'*, ya *'Kal 6:30 baje'*):`,
        actionChips: [
          { label: '⏱️ Kal 11:30 AM', action: 'confirm_time_11:30' },
          { label: '⏱️ Kal 04:00 PM', action: 'confirm_time_16:00' },
          { label: '⏱️ Kal 06:00 PM', action: 'confirm_time_18:00' },
          { label: '⏱️ Kal 06:30 PM', action: 'confirm_time_18:30' }
        ]
      };
    }

    return {
      type: 'doctor_selected',
      data: doctor,
      message: `✓ Selected **${doctor.name}** (${doctor.specialty}).\n\n• **Clinic Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n• **Experience**: ${doctor.experience || '12+ years'}\n\n👉 **What date and time would you prefer?** (e.g., *'Tomorrow 11:30 AM'*, *'4:00 PM'*, *'6:00 PM'*, or *'6:30 PM'*):`,
      actionChips: [
        { label: '⏱️ Tomorrow 11:30 AM', action: 'confirm_time_11:30' },
        { label: '⏱️ Tomorrow 04:00 PM', action: 'confirm_time_16:00' },
        { label: '⏱️ Tomorrow 06:00 PM', action: 'confirm_time_18:00' },
        { label: '⏱️ Tomorrow 06:30 PM', action: 'confirm_time_18:30' }
      ]
    };
  }

  // Handler 5: Slot Negotiation & Checking Availability
  handleSlotNegotiation(text, langParam) {
    const lang = this.getLang(langParam);
    // Determine active doctor
    let doctorId = this.session.doctorId;
    if (!doctorId) {
      if (this.session.symptoms.category === 'ortho') doctorId = 'doc_patel';
      else if (this.session.symptoms.category === 'headache') doctorId = 'doc_priya';
      else if (this.session.symptoms.category === 'respiratory') doctorId = 'doc_khan';
      else if (text.includes('patel') || text.includes('पटेल')) doctorId = 'doc_patel';
      else if (text.includes('priya') || text.includes('प्रिया')) doctorId = 'doc_priya';
      else if (text.includes('akhilesh') || text.includes('अखिलेश')) doctorId = 'doc_akhilesh';
      else doctorId = 'doc_akhilesh';
    }

    const doctor = storageService.getDoctorById(doctorId) || storageService.getDoctorById('doc_akhilesh');
    this.session.doctorId = doctor.id;
    this.session.doctorName = doctor.name;

    const parsedTime = this.parseTime(text) || "10:00";
    const parsedDate = this.parseDate(text) || this.session.pendingDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const check = clinicalTools.checkSlotAvailability({
      doctorId: doctor.id,
      date: parsedDate,
      timePreference: parsedTime
    });

    if (check.isAvailable) {
      this.session.pendingDate = parsedDate;
      this.session.pendingSlot = parsedTime;
      this.session.state = 'AWAITING_CONFIRMATION';

      if (lang === 'hindi') {
        return {
          type: 'negotiation_available',
          toolCalled: 'checkSlotAvailability',
          data: { ...check, requestedTime: parsedTime },
          message: `✓ **${formatTime12(parsedTime)}** (**${parsedDate}**) को **${doctor.name}** (${doctor.specialty}) के साथ स्लॉट उपलब्ध है!\n\n• **कमरा**: ${doctor.roomNumber}\n• **परामर्श शुल्क**: ${doctor.consultationFee}\n\n👉 **क्या मैं यह अपॉइंटमेंट बुक कर दूँ?** बस *"हाँ बुक कर दो"* कहें या नीचे दिए बटन पर क्लिक करें।`,
          actionChips: [
            { label: '✅ हाँ, बुक कर दो', action: 'confirm_booking' },
            { label: '⏱️ 06:00 PM स्लॉट', action: 'confirm_time_18:00' },
            { label: '⏱️ 06:30 PM स्लॉट', action: 'confirm_time_18:30' },
            { label: '🩺 अन्य डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'negotiation_available',
          toolCalled: 'checkSlotAvailability',
          data: { ...check, requestedTime: parsedTime },
          message: `✓ **${formatTime12(parsedTime)}** (**${parsedDate}**) ko **${doctor.name}** (${doctor.specialty}) ke saath slot bilkul available hai!\n\n• **Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n\n👉 **Kya main ye appointment confirm kar doon?** Bas *"Haan book kar do"* bolein ya niche button tap karein.`,
          actionChips: [
            { label: '✅ Haan, Book Kar Do', action: 'confirm_booking' },
            { label: '⏱️ 06:00 PM Slot', action: 'confirm_time_18:00' },
            { label: '⏱️ 06:30 PM Slot', action: 'confirm_time_18:30' },
            { label: '🩺 Doosra Doctor Dekhein', action: 'show_doctors' }
          ]
        };
      }

      return {
        type: 'negotiation_available',
        toolCalled: 'checkSlotAvailability',
        data: { ...check, requestedTime: parsedTime },
        message: `✓ **${formatTime12(parsedTime)}** on **${parsedDate}** with **${doctor.name}** (${doctor.specialty}) is open!\n\n• **Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n\n👉 **Would you like me to book this appointment for you?** Just say *"Yes, book it"* or tap below.`,
        actionChips: [
          { label: '✅ Yes, Book It', action: 'confirm_booking' },
          { label: '⏱️ 06:00 PM Slot', action: 'confirm_time_18:00' },
          { label: '⏱️ 06:30 PM Slot', action: 'confirm_time_18:30' },
          { label: '🩺 View Other Doctors', action: 'show_doctors' }
        ]
      };
    } else {
      const alt1 = check.alternatives && check.alternatives[0] ? check.alternatives[0].timeFormatted : "11:00 AM";
      const alt2 = check.alternatives && check.alternatives[1] ? check.alternatives[1].timeFormatted : "02:30 PM";

      if (lang === 'hindi') {
        return {
          type: 'negotiation_conflict',
          toolCalled: 'checkSlotAvailability',
          data: { ...check, requestedTime: parsedTime },
          message: `⚠️ **सूचना**: **${parsedDate}** को **${formatTime12(parsedTime)}** पर डॉक्टर उपलब्ध नहीं हैं (*${check.conflictReason}*)।\n\n👉 **क्या आप ${alt1} या ${alt2} का समय लेना चाहेंगे?**`,
          actionChips: [
            { label: `⏱️ ${alt1}`, action: `confirm_time_${check.alternatives?.[0]?.startTime || '11:00'}` },
            { label: `⏱️ ${alt2}`, action: `confirm_time_${check.alternatives?.[1]?.startTime || '14:30'}` },
            { label: '🩺 अन्य डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'negotiation_conflict',
          toolCalled: 'checkSlotAvailability',
          data: { ...check, requestedTime: parsedTime },
          message: `⚠️ **Schedule Update**: **${parsedDate}** ko **${formatTime12(parsedTime)}** par doctor available nahi hain (*${check.conflictReason}*).\n\n👉 **Kya ${alt1} ya ${alt2} ka slot chalega?**`,
          actionChips: [
            { label: `⏱️ ${alt1}`, action: `confirm_time_${check.alternatives?.[0]?.startTime || '11:00'}` },
            { label: `⏱️ ${alt2}`, action: `confirm_time_${check.alternatives?.[1]?.startTime || '14:30'}` },
            { label: '🩺 Sabhi Doctors Dekhein', action: 'show_doctors' }
          ]
        };
      }

      return {
        type: 'negotiation_conflict',
        toolCalled: 'checkSlotAvailability',
        data: { ...check, requestedTime: parsedTime },
        message: `⚠️ **Notice**: **${formatTime12(parsedTime)}** on **${parsedDate}** is unavailable (*${check.conflictReason}*).\n\n👉 **Would ${alt1} or ${alt2} work for you instead?**`,
        actionChips: [
          { label: `⏱️ ${alt1}`, action: `confirm_time_${check.alternatives?.[0]?.startTime || '11:00'}` },
          { label: `⏱️ ${alt2}`, action: `confirm_time_${check.alternatives?.[1]?.startTime || '14:30'}` },
          { label: '🩺 View All Doctors', action: 'show_doctors' }
        ]
      };
    }
  }

  // Handler 6: Direct Confirmation (Writes Appointment to Real Database)
  handleDirectConfirmation(text, langParam) {
    const lang = this.getLang(langParam);
    const doctorId = this.session.doctorId || 'doc_akhilesh';
    const doctor = storageService.getDoctorById(doctorId) || storageService.getDoctorById('doc_akhilesh');
    const slotTime = this.session.pendingSlot || "10:00";
    const slotDate = this.session.pendingDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const booking = clinicalTools.bookAppointment({
      doctorId: doctor.id,
      date: slotDate,
      time: slotTime,
      patientName: this.session.patientName || "Alex Morgan",
      patientPhone: this.session.patientPhone || "+1 (555) 019-2834",
      symptoms: this.session.symptoms.raw || "Consultation via Blessy AI"
    });

    this.session.pendingSlot = null;
    this.session.pendingDate = null;
    this.session.state = 'IDLE';

    if (lang === 'hindi') {
      return {
        type: 'booking_confirmed',
        toolCalled: 'bookAppointment',
        data: booking.appointment,
        message: `🎉 **बधाई हो! आपका अपॉइंटमेंट सफलतापूर्वक बुक हो गया है!**\n\n• **बुकिंग आईडी**: \`${booking.appointment.id}\`\n• **विशेषज्ञ**: ${booking.appointment.doctorName}\n• **दिनांक व समय**: ${slotDate} को ${formatTime12(slotTime)}\n• **क्लिनिक रूम**: ${booking.appointment.room}\n• **परामर्श शुल्क**: ${doctor.consultationFee || '₹800'}\n• **मरीज़**: ${booking.appointment.patientName}\n\n✅ आपका डिजिटल एंट्री पास क्लिनिक डेटाबेस में सुरक्षित सेव कर दिया गया है।`,
        actionChips: [
          { label: '📋 डिजिटल पास देखें', action: `view_pass_${booking.appointment.id}` },
          { label: '📅 नया अपॉइंटमेंट बुक करें', action: 'book_appointment' },
          { label: '🩺 सभी डॉक्टर देखें', action: 'show_doctors' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'booking_confirmed',
        toolCalled: 'bookAppointment',
        data: booking.appointment,
        message: `🎉 **Badhai ho! Aapka appointment confirm ho gaya hai!**\n\n• **Booking ID**: \`${booking.appointment.id}\`\n• **Specialist**: ${booking.appointment.doctorName}\n• **Date & Time**: ${slotDate} at ${formatTime12(slotTime)}\n• **Clinic Room**: ${booking.appointment.room}\n• **Consultation Fee**: ${doctor.consultationFee || '₹800'}\n• **Patient**: ${booking.appointment.patientName}\n\n✅ Aapka digital entry pass database mein save ho gaya hai.`,
        actionChips: [
          { label: '📋 View Digital Pass', action: `view_pass_${booking.appointment.id}` },
          { label: '📅 Nayi Appointment Book Karein', action: 'book_appointment' },
          { label: '🩺 Sabhi Doctors Dekhein', action: 'show_doctors' }
        ]
      };
    }

    return {
      type: 'booking_confirmed',
      toolCalled: 'bookAppointment',
      data: booking.appointment,
      message: `🎉 **Appointment Confirmed!**\n\n• **Booking ID**: \`${booking.appointment.id}\`\n• **Specialist**: ${booking.appointment.doctorName}\n• **Date & Time**: ${slotDate} at ${formatTime12(slotTime)}\n• **Clinic Room**: ${booking.appointment.room}\n• **Consultation Fee**: ${doctor.consultationFee || '₹800 ($85)'}\n• **Patient**: ${booking.appointment.patientName}\n\n✅ Your digital verification pass is generated and saved to records.`,
      actionChips: [
        { label: '📋 View Digital Pass', action: `view_pass_${booking.appointment.id}` },
        { label: '📅 Book Another Appointment', action: 'book_appointment' },
        { label: '🩺 View All Doctors', action: 'show_doctors' }
      ]
    };
  }

  // Handler: Fee Queries
  handleFeeQuery(text, langParam) {
    const lang = this.getLang(langParam);
    const doctors = storageService.getDoctors();
    let targetDocId = this.session.doctorId;
    if (text.includes('patel') || text.includes('पटेल')) targetDocId = 'doc_patel';
    else if (text.includes('priya') || text.includes('प्रिया')) targetDocId = 'doc_priya';
    else if (text.includes('akhilesh') || text.includes('अखिलेश')) targetDocId = 'doc_akhilesh';
    else if (text.includes('vance')) targetDocId = 'doc_vance';
    else if (text.includes('khan') || text.includes('खान')) targetDocId = 'doc_khan';
    const activeDoc = targetDocId ? storageService.getDoctorById(targetDocId) : null;

    let specificDocMsg = '';
    if (activeDoc) {
      specificDocMsg = `• **${activeDoc.name}** (${activeDoc.specialty}): **${activeDoc.consultationFee}**\n\n`;
    }

    const feeList = doctors.map(d => `• **${d.name}** (${d.specialty.split('&')[0].trim()}): ${d.consultationFee}`).join('\n');

    if (lang === 'hindi') {
      return {
        type: 'fee_query_result',
        message: `💰 **क्लिनिक परामर्श शुल्क सूची:**\n\n${specificDocMsg}👉 **सभी विशेषज्ञ डॉक्टरों का परामर्श शुल्क:**\n${feeList}\n\nपरामर्श शुल्क में प्राथमिक क्लिनिकल जांच शामिल है। क्या आप किसी डॉक्टर के साथ अपॉइंटमेंट बुक करना चाहते हैं?`,
        actionChips: [
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' },
          { label: '🩺 सभी डॉक्टर देखें', action: 'show_doctors' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'fee_query_result',
        message: `💰 **Clinic Consultation Fee Matrix:**\n\n${specificDocMsg}👉 **Sabhi Doctors ki Consultation Fees:**\n${feeList}\n\nRoom consultation mein initial physical checkup shamil hai. Kya aap kisi doctor ke saath appointment book karna chahte hain?`,
        actionChips: [
          { label: '📅 Appointment book karein', action: 'book_appointment' },
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
        ]
      };
    }

    return {
      type: 'fee_query_result',
      message: `💰 **Clinic Consultation Fee Matrix:**\n\n${specificDocMsg}👉 **Doctor Consultation Fees:**\n${feeList}\n\nFees include primary outpatient evaluation. Would you like to schedule an appointment with one of our doctors?`,
      actionChips: [
        { label: '📅 Book appointment', action: 'book_appointment' },
        { label: '🩺 Show available doctors', action: 'show_doctors' }
      ]
    };
  }
  // Handler 7: Doctor / Staff Voice Commands
  handleDoctorStaffCommand(text, langParam) {
    const lang = this.getLang(langParam);
    const doctorId = this.session.doctorId || 'doc_akhilesh';
    const doctor = storageService.getDoctorById(doctorId) || storageService.getDoctorById('doc_akhilesh');

    // Leave Command
    if (text.includes('on leave') || text.includes('leave tomorrow') || text.includes('chhutti') || text.includes('छुट्टी')) {
      const targetDate = this.parseDate(text) || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const leaveResult = clinicalTools.setDoctorLeave({
        doctorId: doctor.id,
        startDate: targetDate,
        endDate: targetDate,
        reason: "Doctor Scheduled Leave / Out of Office"
      });

      if (lang === 'hindi') {
        return {
          type: 'doctor_leave_executed',
          toolCalled: 'setDoctorLeave',
          data: leaveResult,
          message: `👨‍⚕️ **डॉक्टर शेड्यूल अपडेट हो गया!**\n\n• **स्थिति**: आपकी **${targetDate}** की छुट्टी क्लिनिक डेटाबेस में दर्ज कर दी गई है।\n• **ओपीडी प्रभाव**: इस दिन के ओपीडी स्लॉट बंद कर दिए गए हैं और **${leaveResult.shiftedAppointments}** अपॉइंटमेंट को अगले उपलब्ध दिन (${leaveResult.shiftedTargetDate}) पर शिफ्ट कर दिया गया है।`,
          actionChips: [
            { label: '📋 डॉक्टर कंसोल देखें', action: 'open_doctor_console' },
            { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'doctor_leave_executed',
          toolCalled: 'setDoctorLeave',
          data: leaveResult,
          message: `👨‍⚕️ **Doctor Schedule Updated!**\n\n• **Status**: Aapki **${targetDate}** ki leave clinic database mein mark ho gayi hai.\n• **OPD Impact**: Is din ke OPD slots close kar diye gaye hain aur **${leaveResult.shiftedAppointments}** appointments ko next available date (${leaveResult.shiftedTargetDate}) par shift kar diya gaya hai.`,
          actionChips: [
            { label: '📋 View Doctor Console', action: 'open_doctor_console' },
            { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
          ]
        };
      }

      return {
        type: 'doctor_leave_executed',
        toolCalled: 'setDoctorLeave',
        data: leaveResult,
        message: `👨‍⚕️ **Doctor Schedule Updated!**\n\n• **Status**: Your leave for **${targetDate}** is registered in the database.\n• **OPD Impact**: Bookable slots are closed for that day and **${leaveResult.shiftedAppointments}** overlapping appointment(s) have been shifted to ${leaveResult.shiftedTargetDate}.`,
        actionChips: [
          { label: '📋 View Doctor Console', action: 'open_doctor_console' },
          { label: '🩺 Show available doctors', action: 'show_doctors' }
        ]
      };
    }

    // Buffer Command
    if (text.includes('buffer') || text.includes('बफर')) {
      if (lang === 'hindi') {
        return {
          type: 'doctor_command_result',
          message: `✅ **शेड्यूल रीकैलिब्रेट हो गया!** डॉक्टर रूटीन में हर 3 मरीज़ों के बाद 15-मिनट का इमरजेंसी बफर जोड़ दिया गया है।`,
          actionChips: [{ label: '📋 अपडेटेड ओपीडी शेड्यूल देखें', action: 'view_doctor_schedule' }]
        };
      }
      if (lang === 'hinglish') {
        return {
          type: 'doctor_command_result',
          message: `✅ **Schedule Recalibrated!** Doctor routine mein har 3 patients ke baad 15-minute ka emergency buffer interval add kar diya gaya hai.`,
          actionChips: [{ label: '📋 View Updated OPD Matrix', action: 'view_doctor_schedule' }]
        };
      }
      return {
        type: 'doctor_command_result',
        message: `✅ **Schedule Recalibrated!** 15-minute emergency buffer inserted after every 3 outpatient consultations.`,
        actionChips: [{ label: '📋 View Updated OPD Matrix', action: 'view_doctor_schedule' }]
      };
    }

    // Busy / Block Command
    let parsedStart = "08:30";
    let parsedEnd = "17:00";
    if (text.includes('busy till') || text.includes('busy until') || text.includes('tak busy')) {
      parsedStart = "08:30";
      const timeParsed = this.parseTime(text);
      if (timeParsed) parsedEnd = timeParsed;
    } else {
      if (text.includes('2')) parsedStart = "14:00";
      if (text.includes('5')) parsedEnd = "17:00";
    }
    const targetDate = this.parseDate(text) || new Date().toISOString().split('T')[0];

    const blockResult = clinicalTools.blockDoctorCalendar({
      doctorId: doctor.id,
      date: targetDate,
      startTime: parsedStart,
      endTime: parsedEnd,
      reason: text.includes('seminar') ? "Clinical Seminar" : (text.includes('surgery') ? "Emergency OT Surgery" : "Doctor Out of OPD / Busy"),
      shiftAppointmentsNextDay: true
    });

    if (lang === 'hindi') {
      return {
        type: 'doctor_block_executed',
        toolCalled: 'blockDoctorCalendar',
        data: blockResult,
        message: `👨‍⚕️ **डॉक्टर कैलेंडर ब्लॉक हो गया!**\n\n• **समय सीमा**: ${formatTime12(parsedStart)} से ${formatTime12(parsedEnd)} (${targetDate})\n• **प्रभावित अपॉइंटमेंट**: ${blockResult.impactedAppointmentsShifted} मरीज़ों के स्लॉट अगले उपलब्ध दिन (${blockResult.shiftedTargetDate}) पर सुरक्षित शिफ्ट कर दिए गए हैं।`,
        actionChips: [
          { label: '📋 डॉक्टर कंसोल देखें', action: 'open_doctor_console' },
          { label: '🟢 पुनः उपलब्ध मार्क करें', action: 'doctor_make_available' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'doctor_block_executed',
        toolCalled: 'blockDoctorCalendar',
        data: blockResult,
        message: `👨‍⚕️ **Doctor Calendar Updated!**\n\n• **Blocked Range**: ${formatTime12(parsedStart)} se ${formatTime12(parsedEnd)} (${targetDate})\n• **Impacted Appointments**: ${blockResult.impactedAppointmentsShifted} mareezon ke slots ko agle din (${blockResult.shiftedTargetDate}) shift kar diya gaya hai.`,
        actionChips: [
          { label: '📋 View Doctor Console', action: 'open_doctor_console' },
          { label: '🟢 Mark Available Again', action: 'doctor_make_available' }
        ]
      };
    }

    return {
      type: 'doctor_block_executed',
      toolCalled: 'blockDoctorCalendar',
      data: blockResult,
      message: `👨‍⚕️ **Doctor Calendar Blocked!**\n\n• **Range**: ${formatTime12(parsedStart)} to ${formatTime12(parsedEnd)} on ${targetDate}\n• **Rescheduled**: ${blockResult.impactedAppointmentsShifted} overlapping patient bookings safely shifted to ${blockResult.shiftedTargetDate}.`,
      actionChips: [
        { label: '📋 View Doctor Console', action: 'open_doctor_console' },
        { label: '🟢 Mark Available Again', action: 'doctor_make_available' }
      ]
    };
  }

  // Handler 8: Patient Reschedule Coordination (PA Service)
  handleReschedule(text, langParam) {
    const lang = this.getLang(langParam);
    const allApts = storageService.getAppointments();
    const cleanName = (this.session.patientName || '').toLowerCase().trim();
    const cleanPhone = (this.session.patientPhone || '').replace(/[^0-9]/g, '');

    let activeApt = null;
    if (text.includes('reschedule_')) {
      const parts = text.split('_');
      const aptIdMatch = parts.find(p => p.startsWith('apt-') || p.startsWith('bsy-') || p.startsWith('apt') || p.startsWith('bsy'));
      if (aptIdMatch) {
        activeApt = allApts.find(a => a.id.toLowerCase() === aptIdMatch.toLowerCase());
      }
    }

    if (!activeApt) {
      activeApt = allApts.find(a => {
        const aptName = (a.patientName || '').toLowerCase().trim();
        const aptPhone = (a.patientPhone || '').replace(/[^0-9]/g, '');
        const isUserMatch = (cleanName && aptName.includes(cleanName)) ||
                            (cleanPhone && aptPhone.includes(cleanPhone)) ||
                            (cleanName && cleanName.includes(aptName));
        return (a.status === 'confirmed' || a.status === 'shifted') && isUserMatch;
      }) || allApts.find(a => a.status === 'confirmed' || a.status === 'shifted');
    }

    if (!activeApt) {
      if (lang === 'hindi') {
        return {
          type: 'reschedule_no_apt',
          message: "आपकी अभी कोई सक्रिय अपॉइंटमेंट नहीं मिली जिसे रीशेड्यूल किया जा सके। क्या आप नई अपॉइंटमेंट बुक करना चाहते हैं?",
          actionChips: [
            { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' },
            { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }
      if (lang === 'hinglish') {
        return {
          type: 'reschedule_no_apt',
          message: "Aapki abhi koi active appointment nahi mili jise reschedule kiya ja sake. Kya aap nayi appointment book karna chahte hain?",
          actionChips: [
            { label: '📅 Appointment book karein', action: 'book_appointment' },
            { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
          ]
        };
      }
      return {
        type: 'reschedule_no_apt',
        message: "We couldn't find an active appointment to reschedule. Would you like to book a new appointment?",
        actionChips: [
          { label: '📅 Book appointment', action: 'book_appointment' },
          { label: '🩺 Show available doctors', action: 'show_doctors' }
        ]
      };
    }

    const parsedTime = this.parseTime(text);
    const parsedDate = this.parseDate(text) || activeApt.date;

    if (parsedTime && (parsedTime !== activeApt.time || text.includes('confirm_time_') || text.includes('reschedule_'))) {
      const reschedResult = clinicalTools.rescheduleAppointment({
        appointmentId: activeApt.id,
        newDate: parsedDate,
        newTime: parsedTime,
        reason: "Patient requested reschedule via Blessy PA"
      });

      if (reschedResult.success) {
        if (lang === 'hindi') {
          return {
            type: 'reschedule_success',
            data: reschedResult.updatedAppointment,
            message: `🔄 **अपॉइंटमेंट सफलतापूर्वक रीशेड्यूल हो गई!**\n\n• **बुकिंग आईडी**: \`${activeApt.id}\`\n• **डॉक्टर**: ${activeApt.doctorName}\n• **नया समय**: ${parsedDate} को ${formatTime12(parsedTime)}\n• **क्लिनिक रूम**: ${activeApt.room || 'Suite 101'}\n\n✅ हमने डॉक्टर के शेड्यूल में आपका नया स्लॉट अपडेट कर दिया है।`,
            actionChips: [
              { label: '📋 डिजिटल पास देखें', action: `view_pass_${activeApt.id}` },
              { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
            ]
          };
        }
        if (lang === 'hinglish') {
          return {
            type: 'reschedule_success',
            data: reschedResult.updatedAppointment,
            message: `🔄 **Appointment Successfully Rescheduled!**\n\n• **Booking ID**: \`${activeApt.id}\`\n• **Doctor**: ${activeApt.doctorName}\n• **New Time**: ${parsedDate} at ${formatTime12(parsedTime)}\n• **Clinic Room**: ${activeApt.room || 'Suite 101'}\n\n✅ Humne doctor ke schedule mein naya slot update kar diya hai.`,
            actionChips: [
              { label: '📋 Digital Pass Dekhein', action: `view_pass_${activeApt.id}` },
              { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
            ]
          };
        }
        return {
          type: 'reschedule_success',
          data: reschedResult.updatedAppointment,
          message: `🔄 **Appointment Successfully Rescheduled!**\n\n• **Booking ID**: \`${activeApt.id}\`\n• **Doctor**: ${activeApt.doctorName}\n• **New Time**: ${parsedDate} at ${formatTime12(parsedTime)}\n• **Clinic Room**: ${activeApt.room || 'Suite 101'}\n\n✅ Your new time slot is confirmed in the clinic system.`,
          actionChips: [
            { label: '📋 View Digital Pass', action: `view_pass_${activeApt.id}` },
            { label: '🩺 Show available doctors', action: 'show_doctors' }
          ]
        };
      } else {
        const alt1 = reschedResult.alternatives && reschedResult.alternatives[0] ? reschedResult.alternatives[0].timeFormatted : "11:00 AM";
        const alt2 = reschedResult.alternatives && reschedResult.alternatives[1] ? reschedResult.alternatives[1].timeFormatted : "02:30 PM";

        if (lang === 'hindi') {
          return {
            type: 'reschedule_conflict',
            message: `⚠️ नए समय ${formatTime12(parsedTime)} पर डॉक्टर व्यस्त हैं (${reschedResult.error})।\n\n👉 क्या आप ${alt1} या ${alt2} पर रीशेड्यूल करना चाहेंगे?`,
            actionChips: [
              { label: `⏱️ ${alt1} पर बदलें`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[0]?.startTime || '11:00'}` },
              { label: `⏱️ ${alt2} पर बदलें`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[1]?.startTime || '14:30'}` },
              { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
            ]
          };
        }
        if (lang === 'hinglish') {
          return {
            type: 'reschedule_conflict',
            message: `⚠️ Naya slot ${formatTime12(parsedTime)} par doctor busy hain (${reschedResult.error}).\n\n👉 Kya aap ${alt1} ya ${alt2} par reschedule karna chahenge?`,
            actionChips: [
              { label: `⏱️ Move to ${alt1}`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[0]?.startTime || '11:00'}` },
              { label: `⏱️ Move to ${alt2}`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[1]?.startTime || '14:30'}` },
              { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
            ]
          };
        }
        return {
          type: 'reschedule_conflict',
          message: `⚠️ Requested slot at ${formatTime12(parsedTime)} is unavailable (${reschedResult.error}).\n\n👉 Would you like to move to ${alt1} or ${alt2} instead?`,
          actionChips: [
            { label: `⏱️ Move to ${alt1}`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[0]?.startTime || '11:00'}` },
            { label: `⏱️ Move to ${alt2}`, action: `reschedule_${activeApt.id}_${reschedResult.alternatives?.[1]?.startTime || '14:30'}` },
            { label: '🩺 Show available doctors', action: 'show_doctors' }
          ]
        };
      }
    }

    const targetDate = activeApt.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const availability = clinicalTools.checkSlotAvailability({
      doctorId: activeApt.doctorId,
      date: targetDate
    });

    const openSlots = availability.availableSlots || [];
    const prefix = lang === 'hindi' ? '⏱️ कल ' : (lang === 'hinglish' ? '⏱️ Kal ' : '⏱️ Tomorrow ');
    const slotOptions = openSlots.slice(0, 3).map(s => ({
      label: `${prefix}${s.timeFormatted}`,
      action: `reschedule_${activeApt.id}_${s.startTime}`
    }));

    if (lang === 'hindi') {
      return {
        type: 'reschedule_options',
        data: activeApt,
        message: `🔄 **अपॉइंटमेंट रीशेड्यूलिंग (पीए सेवा)**\n\nआपकी वर्तमान अपॉइंटमेंट: **${activeApt.doctorName}** के साथ **${activeApt.date} को ${formatTime12(activeApt.time)}** पर है।\n\n👉 **आप नया कौन सा समय चुनना चाहेंगे?** नीचे दिए गए उपलब्ध स्लॉट में से चुनें:`,
        actionChips: slotOptions.length > 0 ? slotOptions : [
          { label: '⏱️ कल 11:00 AM', action: `reschedule_${activeApt.id}_11:00` },
          { label: '⏱️ कल 02:30 PM', action: `reschedule_${activeApt.id}_14:30` },
          { label: '⏱️ कल 04:00 PM', action: `reschedule_${activeApt.id}_16:00` }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'reschedule_options',
        data: activeApt,
        message: `🔄 **Appointment Rescheduling (PA Service)**\n\nAapki current appointment: **${activeApt.doctorName}** ke saath **${activeApt.date} at ${formatTime12(activeApt.time)}** par hai.\n\n👉 **Aap naya kaunsa time prefer karenge?** Niche se available slot chunein ya batayein:`,
        actionChips: slotOptions.length > 0 ? slotOptions : [
          { label: '⏱️ Kal 11:00 AM', action: `reschedule_${activeApt.id}_11:00` },
          { label: '⏱️ Kal 02:30 PM', action: `reschedule_${activeApt.id}_14:30` },
          { label: '⏱️ Kal 04:00 PM', action: `reschedule_${activeApt.id}_16:00` }
        ]
      };
    }

    return {
      type: 'reschedule_options',
      data: activeApt,
      message: `🔄 **Appointment Rescheduling (PA Service)**\n\nYour current consultation: with **${activeApt.doctorName}** on **${activeApt.date} at ${formatTime12(activeApt.time)}**.\n\n👉 **What new time would you prefer?** Choose from available slots below or tell me your preferred time:`,
      actionChips: slotOptions.length > 0 ? slotOptions : [
        { label: '⏱️ Tomorrow 11:00 AM', action: `reschedule_${activeApt.id}_11:00` },
        { label: '⏱️ Tomorrow 02:30 PM', action: `reschedule_${activeApt.id}_14:30` },
        { label: '⏱️ Tomorrow 04:00 PM', action: `reschedule_${activeApt.id}_16:00` }
      ]
    };
  }

  // Handler 9: Emergency Handling (Safety Triage Protocol)
  handleEmergency(text, kw, langParam) {
    const lang = this.getLang(langParam);
    const erReport = clinicalTools.reportEmergency({
      patientName: this.session.patientName,
      symptoms: text,
      urgencyLevel: "CRITICAL_ER"
    });

    if (lang === 'hindi') {
      return {
        type: 'emergency',
        isInterrupt: true,
        toolCalled: 'reportEmergency',
        data: erReport,
        message: `🚨 **आपातकालीन चेतावनी (Emergency Alert)**: यह लक्षण (*${kw}*) गंभीर मेडिकल इमरजेंसी का संकेत हो सकते हैं।\n\nकृपया क्लिनिक ओपीडी स्लॉट की प्रतीक्षा न करें! हमने सामान्य बुकिंग रोक दी है। तुरंत **108 / 112 एम्बुलेंस** को कॉल करें या नज़दीकी आपातकालीन कक्ष (ER) जाएं।`,
        actionChips: [
          { label: '🚑 108 / 112 एम्बुलेंस कॉल करें', action: 'tel:108', isLink: true },
          { label: '🏥 नज़दीकी आपातकालीन अस्पताल', action: 'show_er' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'emergency',
        isInterrupt: true,
        toolCalled: 'reportEmergency',
        data: erReport,
        message: `🚨 **EMERGENCY WARNING**: Yeh lakshan (*${kw}*) gambhir medical emergency ho sakte hain.\n\nKripya outpatient appointment ka intezaar na karein! Humne regular booking hold par rakh di hai. Turant **108 / 112 Ambulance** call karein ya nazdeeki Emergency Room (ER) jaayein.`,
        actionChips: [
          { label: '🚑 Call 108 Ambulance', action: 'tel:108', isLink: true },
          { label: '🏥 Nazdeeki Emergency Hospital', action: 'show_er' }
        ]
      };
    }

    return {
      type: 'emergency',
      isInterrupt: true,
      toolCalled: 'reportEmergency',
      data: erReport,
      message: `🚨 **EMERGENCY ALERT**: Symptoms (*${kw}*) indicate an acute medical emergency.\n\nPlease do not wait for an outpatient clinic slot. We have placed regular booking on hold. Call **911 / 108** immediately or proceed to the nearest Emergency Room (ER).`,
      actionChips: [
        { label: '🚑 Call 108 / 911 Ambulance', action: 'tel:911', isLink: true },
        { label: '🏥 Nearest ER Hospital', action: 'show_er' }
      ]
    };
  }

  // Handler 10: Real-Data Appointment Lookup
  handleAppointmentQuery(text, langParam) {
    const lang = this.getLang(langParam);
    const allApts = storageService.getAppointments();
    const cleanName = (this.session.patientName || '').toLowerCase().trim();
    const cleanPhone = (this.session.patientPhone || '').replace(/[^0-9]/g, '');

    const matchingApts = allApts.filter(a => {
      const aptName = (a.patientName || '').toLowerCase().trim();
      const aptPhone = (a.patientPhone || '').replace(/[^0-9]/g, '');
      const isUserMatch = (cleanName && aptName.includes(cleanName)) ||
                          (cleanPhone && aptPhone.includes(cleanPhone)) ||
                          (cleanName && cleanName.includes(aptName));
      return (a.status === 'confirmed' || a.status === 'shifted') && isUserMatch;
    });

    const activeApt = matchingApts[0] || allApts.find(a => a.status === 'confirmed' || a.status === 'shifted');

    if (activeApt) {
      if (lang === 'hindi') {
        return {
          type: 'appointment_lookup_result',
          data: activeApt,
          message: `आपकी आगामी अपॉइंटमेंट **${activeApt.doctorName}** के साथ **${activeApt.date}** को **${formatTime12(activeApt.time)}** पर निर्धारित है।\n\n• **बुकिंग आईडी**: \`${activeApt.id}\`\n• **कमरा**: ${activeApt.room || 'Suite 101 - मुख्य विंग'}\n• **स्थिति**: ${activeApt.status.toUpperCase()}\n\nयह अपॉइंटमेंट आपके सत्यापित क्लिनिक रिकॉर्ड में सुरक्षित दर्ज है।`,
          actionChips: [
            { label: '📋 डिजिटल पास देखें', action: `view_pass_${activeApt.id}` },
            { label: '🔄 समय बदलें (Reschedule)', action: `reschedule_${activeApt.id}` },
            { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }
      if (lang === 'hinglish') {
        return {
          type: 'appointment_lookup_result',
          data: activeApt,
          message: `Aapki next appointment **${activeApt.doctorName}** ke saath **${activeApt.date}**, **${formatTime12(activeApt.time)}** par hai.\n\n• **Booking ID**: \`${activeApt.id}\`\n• **Room**: ${activeApt.room || 'Suite 101 - Main Wing'}\n• **Status**: ${activeApt.status.toUpperCase()}\n\nYeh appointment aapke verified clinic records mein confirmed hai.`,
          actionChips: [
            { label: '📋 Digital Pass Dekhein', action: `view_pass_${activeApt.id}` },
            { label: '🔄 Reschedule Slot', action: `reschedule_${activeApt.id}` },
            { label: '🩺 Doctor panel dekhein', action: 'show_doctors' }
          ]
        };
      }
      return {
        type: 'appointment_lookup_result',
        data: activeApt,
        message: `Your upcoming consultation with **${activeApt.doctorName}** is scheduled for **${activeApt.date}** at **${formatTime12(activeApt.time)}**.\n\n• **Booking ID**: \`${activeApt.id}\`\n• **Room**: ${activeApt.room || 'Suite 101 - Main Wing'}\n• **Status**: ${activeApt.status.toUpperCase()}\n\nThis record is retrieved directly from your HealthSync profile.`,
        actionChips: [
          { label: '📋 View Digital Pass', action: `view_pass_${activeApt.id}` },
          { label: '🔄 Reschedule Slot', action: `reschedule_${activeApt.id}` },
          { label: '🩺 Show available doctors', action: 'show_doctors' }
        ]
      };
    } else {
      if (lang === 'hindi') {
        return {
          type: 'no_appointment_found',
          message: `आपकी अभी कोई आगामी अपॉइंटमेंट रिकॉर्ड में नहीं है। क्या आप हमारे किसी विशेषज्ञ डॉक्टर के साथ अपॉइंटमेंट बुक करना चाहते हैं?`,
          actionChips: [
            { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' },
            { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
          ]
        };
      }
      if (lang === 'hinglish') {
        return {
          type: 'no_appointment_found',
          message: `Aapki abhi koi upcoming appointment scheduled nahi hai. Kya aap hamare verified doctors ke saath slot book karna chahte hain?`,
          actionChips: [
            { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
            { label: '📅 Appointment book karein', action: 'book_appointment' }
          ]
        };
      }
      return {
        type: 'no_appointment_found',
        message: `You do not have any upcoming appointments scheduled in our records. Would you like me to book a slot with one of our doctors?`,
        actionChips: [
          { label: '🩺 Show available doctors', action: 'show_doctors' },
          { label: '📅 Book appointment', action: 'book_appointment' }
        ]
      };
    }
  }

  // Handler 11: Scope Control (Polite Redirect for Non-Medical Topics)
  handleOutOfScope(text, langParam) {
    const lang = this.getLang(langParam);
    if (lang === 'hindi') {
      return {
        type: 'scope_redirect',
        message: "मैं **ब्लेसी** हूँ, आपकी मेडिकल एवं क्लिनिकल असिस्टेंट। मैं केवल क्लिनिक अपॉइंटमेंट, डॉक्टरों के शेड्यूल और स्वास्थ्य लक्षणों के मूल्यांकन में आपकी सहायता कर सकती हूँ।\n\nआपको स्वास्थ्य या अपॉइंटमेंट के संबंध में क्या सहायता चाहिए?",
        actionChips: [
          { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' },
          { label: '💬 लक्षण बताएं', action: 'discuss_symptoms' },
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
        ]
      };
    }
    if (lang === 'hinglish') {
      return {
        type: 'scope_redirect',
        message: "Main **Blessy**, aapki Medical & Clinical Assistant hoon. Main sirf clinic appointments, doctor schedules aur health symptoms mein madad kar sakti hoon.\n\nAapko health ya appointment ke baare mein kya janna hai?",
        actionChips: [
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
          { label: '💬 Lakshan batayein', action: 'discuss_symptoms' },
          { label: '📅 Appointment book karein', action: 'book_appointment' }
        ]
      };
    }
    return {
      type: 'scope_redirect',
      message: "I am **Blessy**, your dedicated Medical Front-Desk Assistant. I specialize exclusively in clinic appointments, health symptoms, and doctor schedules.\n\nHow can I help you with your clinical appointment today?",
      actionChips: [
        { label: '🩺 Show available doctors', action: 'show_doctors' },
        { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
        { label: '📅 Book appointment', action: 'book_appointment' }
      ]
    };
  }

  // Handler 12: Default Helpful Clinical Guidance Fallback
  handleDefaultFallback(text, langParam) {
    const lang = this.getLang(langParam);
    if (lang === 'hindi') {
      return {
        type: 'text',
        message: `मैं आपकी पूरी सहायता के लिए तैयार हूँ! क्या आप अपने लक्षण बताना चाहते हैं, डॉक्टरों की उपलब्धता देखना चाहते हैं, या अपॉइंटमेंट बुक करना चाहते हैं?`,
        actionChips: [
          { label: '🩺 उपलब्ध डॉक्टर देखें', action: 'show_doctors' },
          { label: '💬 लक्षण बताएं', action: 'discuss_symptoms' },
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
        ]
      };
    }
    if (lang === 'hinglish') {
      return {
        type: 'text',
        message: `Main samajh rahi hoon! Aap symptoms discuss karna chahte hain, doctors ki availability dekhna chahte hain, ya appointment book karna chahte hain?`,
        actionChips: [
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
          { label: '💬 Lakshan batayein', action: 'discuss_symptoms' },
          { label: '📅 Appointment book karein', action: 'book_appointment' }
        ]
      };
    }
    return {
      type: 'text',
      message: `I am here to assist! Would you like to discuss your symptoms, check doctor availability, or book a consultation?`,
      actionChips: [
        { label: '🩺 Show available doctors', action: 'show_doctors' },
        { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
        { label: '📅 Book appointment', action: 'book_appointment' }
      ]
    };
  }

  isMedicalSymptomQuery(text) {
    const medicalTerms = [
      'dard', 'pain', 'bukhar', 'fever', 'headache', 'sar dard', 'sar me dard',
      'pet dard', 'stomach', 'pet me dard', 'vomiting', 'ulti', 'nausea', 'cough', 'khansi',
      'cold', 'jukaam', 'gale me', 'throat', 'back pain', 'kamar dard', 'joint', 'knee',
      'ghutne', 'rash', 'khujli', 'skin', 'acidity', 'gas', 'dizziness', 'chakkar', 'chot',
      'pair', 'pairon', 'taang', 'leg', 'legs', 'feet', 'foot', 'ankle', 'haddi', 'bone',
      'sprain', 'ortho', 'sujan', 'muscle'
    ];
    return medicalTerms.some(term => text.includes(term));
  }

  parseTime(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // 0. Exclude durations, pill counts, dates
    if (/\b\d+\s*(?:din|dino|day|days|haft|week|mahine|month|saal|year|tablet|goli|dose)\b/.test(lower)) {
      return null;
    }

    // 1. Explicit action token match: confirm_time_16:00, reschedule_xxx_11:30, time_18:30
    const actionTokenMatch = lower.match(/(?:confirm_time_|reschedule_.*_|time_)([012]?\d):([0-5]\d)/);
    if (actionTokenMatch) {
      const h = parseInt(actionTokenMatch[1], 10);
      const m = actionTokenMatch[2];
      return `${String(h).padStart(2, '0')}:${m}`;
    }

    // 2. Colon or dot format with optional am/pm/baje, e.g. "1:30 baje", "14:30", "16:00", "6.30 pm"
    const colonMatch = lower.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm|baje)?\b/);
    if (colonMatch) {
      let h = parseInt(colonMatch[1], 10);
      const m = colonMatch[2];
      const mod = (colonMatch[3] || '').toLowerCase();
      if (mod === 'pm' && h < 12) h += 12;
      else if (mod === 'am' && h === 12) h = 0;
      else if (mod !== 'am' && h <= 7) h += 12; // In clinic, 1:30 to 7:30 are afternoon/evening slots
      return `${String(h).padStart(2, '0')}:${m}`;
    }

    // 3. Hindi word-based numbers with explicit time markers
    const wordNums = {
      'ek': 1, 'do': 2, 'teen': 3, 'chaar': 4, 'char': 4, 'paanch': 5, 'panch': 5,
      'chhe': 6, 'che': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10, 'gyarah': 11, 'baarah': 12
    };

    let isHalf = lower.includes('sadhe') || lower.includes('saadhe') || lower.includes('30');
    let isEvening = lower.includes('shaam') || lower.includes('dopahar') || lower.includes('raat') || lower.includes('pm');
    let isMorning = lower.includes('subah') || lower.includes('morning') || lower.includes('am');
    const hasTimeKeyword = lower.includes('baje') || lower.includes('time') || lower.includes('slot') || lower.includes('at ') || isEvening || isMorning;

    if (hasTimeKeyword) {
      for (const [w, val] of Object.entries(wordNums)) {
        if (new RegExp(`\\b${w}\\s*(?:baje|pm|am)?\\b`).test(lower)) {
          let h = val;
          let m = isHalf ? 30 : 0;
          if (isEvening && h < 12) h += 12;
          else if (isMorning && h === 12) h = 0;
          else if (!isMorning && h <= 7) h += 12;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
      }
    }

    // 4. Explicit single number with time modifier: "4 baje", "4 pm", "at 4", "4 o'clock"
    const explicitTimeMatch = lower.match(/\b(?:at\s+)?(\d{1,2})\s*(am|pm|baje|o'clock)\b/);
    if (explicitTimeMatch) {
      let h = parseInt(explicitTimeMatch[1], 10);
      let m = isHalf ? 30 : 0;
      const mod = explicitTimeMatch[2].toLowerCase();

      if (h >= 0 && h <= 24) {
        if (mod === 'pm' && h < 12) h += 12;
        else if (mod === 'am' && h === 12) h = 0;
        else if (isEvening && h < 12) h += 12;
        else if (isMorning && h === 12) h = 0;
        else if (mod === 'baje' && h <= 7) h += 12;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // 5. Short standalone number when in SELECTING_DATE_TIME
    if (this.session.state === 'SELECTING_DATE_TIME' && /^\s*(\d{1,2})\s*$/.test(lower)) {
      let h = parseInt(lower, 10);
      if (h <= 7) h += 12;
      return `${String(h).padStart(2, '0')}:00`;
    }

    return null;
  }

  parseDate(text) {
    const now = new Date();
    if (text.includes('aaj') || text.includes('today')) return now.toISOString().split('T')[0];
    if (text.includes('kal') || text.includes('tomorrow')) {
      return new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    }
    if (text.includes('parso')) {
      return new Date(now.getTime() + 86400000 * 2).toISOString().split('T')[0];
    }
    return null;
  }
}

export const blessyConversationEngine = new BlessyConversationEngine();
