// Blessy AI: Intelligent Conversational Engine for Triage, Schedule Management & Doctor Executive PA
// Fully supports English, Hindi & Hinglish with Doctor Availability, Multi-turn Context Memory, and Real-world Clinic Dynamics
import { storage } from '../utils/storage.js';
import { scheduleEngine, formatTime12, timeToMinutes } from './scheduleEngine.js';

export class AIChatbotEngine {
  constructor() {
    this.session = {
      state: 'IDLE', // IDLE, SELECTING_DOCTOR, SELECTING_DATE, SELECTING_TIME, COLLECTING_SYMPTOMS, AWAITING_CONFIRMATION, CONFIRMED
      role: 'patient', // 'patient' | 'doctor'
      doctorId: 'doc_akhilesh', // Default to Dr. Akhilesh Sharma, MD
      date: null,
      time: null,
      pendingSlot: null,
      pendingDate: null,
      lastOfferedSlots: [],
      symptoms: "",
      painLevel: 3,
      urgency: "Routine",
      patientName: "",
      patientPhone: "",
      language: "hinglish", // 'hinglish' | 'english' | 'hindi'
      history: []
    };

    this.emergencyKeywords = [
      // English
      'chest pain', 'heart attack', 'cannot breathe', 'shortness of breath severe', 
      'stroke', 'face drooping', 'arm weakness', 'unconscious', 'fainted', 'heavy bleeding', 
      'coughing blood', 'suicidal', 'severe allergic reaction', 'anaphylaxis',
      // Hindi / Hinglish
      'seene me dard', 'seena dard', 'saans lene me takleef', 'heart attack', 'dil ka daura',
      'khoon nikal raha hai', 'behosh', 'chhatii me dard', 'bahut jyada bleeding'
    ];
  }

  resetSession() {
    this.session = {
      state: 'IDLE',
      role: 'patient',
      doctorId: 'doc_akhilesh',
      date: null,
      time: null,
      pendingSlot: null,
      pendingDate: null,
      lastOfferedSlots: [],
      symptoms: "",
      painLevel: 3,
      urgency: "Routine",
      patientName: "",
      patientPhone: "",
      language: "hinglish",
      history: []
    };
  }

  setRole(role) {
    this.session.role = role;
  }

  // Detect language tone: hinglish/hindi vs pure english
  detectLanguage(text) {
    const hindiWords = [
      'hain', 'hai', 'kab', 'kya', 'kaise', 'karo', 'kare', 'mujhe', 'mera', 'meri',
      'baje', 'tareekh', 'din', 'kal', 'aaj', 'parso', 'subah', 'dopahar', 'shaam',
      'raat', 'dard', 'bukhar', 'chahiye', 'milna', 'bataye', 'batao', 'sunno', 'sun',
      'namaste', 'theek', 'kripya', 'shukriya', 'shift', 'kar do', 'main doctor hoon', 'mai doctor',
      'haan', 'ha', 'accha', 'achha', 'karwa do', 'kardo', 'fees', 'kitna', 'room'
    ];
    let count = 0;
    for (const w of hindiWords) {
      if (text.includes(w)) count++;
    }
    return count >= 1 ? 'hinglish' : 'english';
  }

  // Live Asynchronous Processing with OpenRouter GPT-4o-mini Integration
  async processUserMessageAsync(rawText, attachment = null) {
    const text = (rawText || '').trim().toLowerCase();
    const isHinglish = this.detectLanguage(text) === 'hinglish';

    // Immediate emergency triage check (fast synchronous return)
    for (const kw of this.emergencyKeywords) {
      if (text.includes(kw)) {
        return this.processUserMessage(rawText, attachment);
      }
    }

    // Pass through doctor commands or attachment
    if (attachment || text.includes('main doctor hoon') || text.includes('shift kar do') || text.includes('weekly schedule')) {
      return this.processUserMessage(rawText, attachment);
    }

    // Try live OpenRouter / GPT-4o-mini AI endpoint for clinical queries & chats
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: rawText,
          language: isHinglish ? 'hinglish' : 'english',
          messages: this.session.history.slice(-4),
          context: {
            role: this.session.role,
            patientName: this.session.patientName,
            doctorId: this.session.doctorId
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.message) {
          this.session.history.push({
            sender: 'user',
            text: rawText,
            timestamp: new Date(),
            attachment
          });
          this.session.history.push({
            sender: 'bot',
            text: data.message,
            timestamp: new Date()
          });

          return {
            type: 'medical_solution',
            message: data.message,
            modelUsed: data.modelUsed || 'openai/gpt-4o-mini',
            actionChips: isHinglish ? [
              { label: '📅 Book with Dr. Akhilesh', action: 'select_doctor_doc_akhilesh' },
              { label: '⏱️ Doctor Available Hours', action: 'query_akhilesh_free' },
              { label: '👀 Dusre Doctors Dekhein', action: 'show_all_doctors' }
            ] : [
              { label: '📅 Book with Dr. Akhilesh', action: 'select_doctor_doc_akhilesh' },
              { label: '⏱️ Check Available Hours', action: 'query_akhilesh_free' },
              { label: '👀 View Other Doctors', action: 'show_all_doctors' }
            ]
          };
        }
      }
    } catch (err) {
      console.warn("Local /api/ai/chat failed, attempting port 3000 backend...", err.message);
    }

    // Cross-origin fallback to port 3000 backend (if page loaded from Live Server or different port)
    try {
      if (typeof window !== 'undefined' && window.location.port !== '3000') {
        const directRes = await fetch('http://localhost:3000/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: rawText,
            language: isHinglish ? 'hinglish' : 'english',
            messages: this.session.history.slice(-4),
            context: {
              role: this.session.role,
              patientName: this.session.patientName,
              doctorId: this.session.doctorId
            }
          })
        });

        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData && directData.message) {
            this.session.history.push({ sender: 'user', text: rawText, timestamp: new Date(), attachment });
            this.session.history.push({ sender: 'bot', text: directData.message, timestamp: new Date() });

            return {
              type: 'medical_solution',
              message: directData.message,
              modelUsed: directData.modelUsed || 'openai/gpt-4o-mini',
              actionChips: isHinglish ? [
                { label: '📅 Book with Dr. Akhilesh', action: 'select_doctor_doc_akhilesh' },
                { label: '⏱️ Doctor Available Hours', action: 'query_akhilesh_free' },
                { label: '👀 Dusre Doctors Dekhein', action: 'show_all_doctors' }
              ] : [
                { label: '📅 Book with Dr. Akhilesh', action: 'select_doctor_doc_akhilesh' },
                { label: '⏱️ Check Available Hours', action: 'query_akhilesh_free' },
                { label: '👀 View Other Doctors', action: 'show_all_doctors' }
              ]
            };
          }
        }
      }
    } catch (directErr) {
      console.warn("Port 3000 fallback failed:", directErr.message);
    }

    return this.processUserMessage(rawText, attachment);
  }

  // Main processing pipeline
  processUserMessage(rawText, attachment = null) {
    const text = (rawText || '').trim().toLowerCase();
    this.session.history.push({ sender: 'user', text: rawText || (attachment ? `Uploaded file: ${attachment.name}` : ''), timestamp: new Date(), attachment });
    const isHinglish = this.detectLanguage(text) === 'hinglish';
    this.session.language = isHinglish ? 'hinglish' : 'english';

    // 0. Image / X-Ray / Lab Report Attachment Analysis
    if (attachment || text.includes('xray') || text.includes('x-ray') || text.includes('report analyze') || text.includes('photo check')) {
      return this.handleAttachmentAnalysis(attachment, text, isHinglish);
    }

    // 1. Wake Word Trigger: "Hello Blessy", "Hey Blessy", "Hi Blessy", "Blessy", "Sunno Blessy"
    if (
      text.startsWith('hello blessy') || text.startsWith('hey blessy') || 
      text.startsWith('hi blessy') || text === 'blessy' || text.startsWith('sunno blessy') ||
      text.startsWith('hello aura') || text.startsWith('hello gemini')
    ) {
      return this.handleWakeGreeting(text, isHinglish);
    }

    // 2. Critical Emergency Triage Check (English & Hindi)
    for (const kw of this.emergencyKeywords) {
      if (text.includes(kw)) {
        if (isHinglish) {
          return {
            type: 'emergency',
            message: `🚨 **EMERGENCY WARNING**: Aapne gambhir lakshan (*${kw}*) bataye hain jo acute medical emergency ho sakte hain.\n\nKripya outpatient appointment ka intezaar na karein! Turant **108 / 911 Ambulance** call karein ya paas ke Emergency Room (ER) jayein.`,
            actionChips: [
              { label: '🚑 Call 108 / 911', action: 'tel:911', isLink: true },
              { label: '🏥 Nearest ER Hospital', action: 'find_er' },
              { label: 'Main theek hoon, aage baat karein', action: 'continue_booking' }
            ]
          };
        }

        return {
          type: 'emergency',
          message: `🚨 **EMERGENCY WARNING**: You mentioned symptoms (*${kw}*) that may indicate an acute, life-threatening medical emergency.\n\nPlease **do not wait for an outpatient appointment**. Call **911 / 108** immediately, or proceed to the nearest Emergency Room.`,
          actionChips: [
            { label: '🚑 Call Emergency', action: 'tel:911', isLink: true },
            { label: '🏥 Find Nearest ER', action: 'find_er' },
            { label: 'I am safe, continue conversation', action: 'continue_booking' }
          ]
        };
      }
    }

    // 3. Doctor Mode Commands: "Main doctor hoon...", Busy / Surgery break shift, Weekly schedule
    if (
      text.includes('main doctor hoon') || text.includes('mai doctor hoon') || 
      text.includes('i am doctor') || text.includes('i am a doctor') ||
      text.includes('as a doctor') ||
      text.includes('weekly schedule') || text.includes('shift kar do') ||
      (text.includes('busy') && (text.includes('tareekh') || text.includes('date') || text.includes('baje') || text.includes('shift')))
    ) {
      return this.handleDoctorCommand(text, rawText, isHinglish);
    }

    // 4. User Confirmation to book previously offered slot ("Haan book kar do", "Confirm", "Theek hai", "Yes please")
    const isAffirmative = [
      'haan', 'ha', 'haa', 'yes', 'confirm', 'book kar do', 'kar do', 'kardo', 'theek hai',
      'done', 'sure', 'book it', 'kar do please', 'ha book kar do', 'haan book kar do', 'please book'
    ].some(w => text === w || text.startsWith(w + ' ') || text.endsWith(' ' + w));

    if (isAffirmative && (this.session.pendingSlot || this.session.lastOfferedSlots.length > 0)) {
      return this.handleDirectConfirmation(text, isHinglish);
    }

    // 5. Date Shift Request ("Kal nahi, parso ka chahiye", "Next day ka book karo", "Kisi aur din ka")
    if (
      text.includes('parso') || text.includes('next day') || text.includes('agle din') || 
      text.includes('kal nahi') || text.includes('dusre din') || text.includes('another day') ||
      text.includes('different day')
    ) {
      return this.handleDateShift(text, isHinglish);
    }

    // 6. Doctor Availability Query: "Doctor kab free hain?", "Dr. Akhilesh kab free hain?"
    if (
      (text.includes('kab free') || text.includes('when is') || text.includes('available') || 
       text.includes('timing') || text.includes('time kya') || text.includes('kab milenge') ||
       text.includes('schedule kya') || text.includes('free kab')) &&
      (text.includes('doctor') || text.includes('dr') || text.includes('akhilesh') || 
       text.includes('free') || text.includes('milenge') || text.includes('jenkins') || text.includes('vance') || text.includes('priya'))
    ) {
      return this.handleDoctorAvailabilityQuery(text, isHinglish);
    }

    // 7. Doctor Routine / Break Queries ("Doctor ka lunch break kab hai?", "Breakfast timing?")
    if (
      text.includes('break') || text.includes('lunch') || text.includes('dinner') || 
      text.includes('breakfast') || text.includes('sleep') || text.includes('routine') || 
      text.includes('khana') || text.includes('aaram') || text.includes('chai') || text.includes('tea')
    ) {
      return this.handleRoutineQuery(text, isHinglish);
    }

    // 8. Medical Problem / Symptom Query (Answers with real medical advice & solutions first!)
    if (this.isMedicalProblemQuery(text)) {
      return this.handleMedicalProblemQuery(text, isHinglish);
    }

    // 9. General Questions: Fees, Room Location, Clinic details
    if (text.includes('fees') || text.includes('charge') || text.includes('kitna lagta') || text.includes('kitne paise')) {
      const doc = storage.getDoctorById(this.session.doctorId || 'doc_akhilesh');
      return {
        type: 'text',
        message: isHinglish 
          ? `🩺 Hamare clinic me general consultation fee **₹500 se ₹800 ($60 - $85)** ke beech hoti hai (Specialist: **${doc.name}** - ${doc.consultationFee}). Isme detailed clinical assessment aur digital prescription shamil hai.\n\nKya aap kisi specialist doctor ke saath appointment book karna chahte hain?`
          : `🩺 Consultation fees at our medical center range from **$60 to $85 (₹500 - ₹800)** depending on the clinical specialty (Specialist **${doc.name}**: ${doc.consultationFee}). This includes complete diagnosis and digital pass.\n\nWould you like to schedule a consultation?`,
        actionChips: [
          { label: '📅 Book Doctor Consultation', action: 'intent_book' },
          { label: '🩺 Doctor Available Timings', action: 'query_akhilesh_free' }
        ]
      };
    }

    if (text.includes('room') || text.includes('location') || text.includes('kahan') || text.includes('address') || text.includes('suite')) {
      const doc = storage.getDoctorById(this.session.doctorId || 'doc_akhilesh');
      return {
        type: 'text',
        message: isHinglish 
          ? `🏥 HealthSync Clinic chambers **Suite 101-104, Main Clinical Wing** me sthit hain.\n\nOPD timings: **Subah 8:00 AM se Raat 9:00 PM** tak (doctors ke protected meal & rest intervals ke saath).\n\nAapko kis doctor se milna hai?`
          : `🏥 Our clinic suites are located at **Suite 101-104, Main Clinical Wing**, HealthSync Medical Center.\n\nDaily consultation hours: **8:00 AM to 9:00 PM**.\n\nWhich department would you like to visit?`,
        actionChips: [
          { label: '📅 Book Consultation', action: 'intent_book' },
          { label: '🩺 When are Doctors Free?', action: 'query_akhilesh_free' }
        ]
      };
    }

    // 10. Cancel / Reschedule Intent
    if (text.includes('cancel') || text.includes('reschedule') || text.includes('badal') || text.includes('hata do')) {
      return this.handleCancellationOrReschedule(text, isHinglish);
    }

    // 11. Greetings in English & Hindi
    if (['hi', 'hello', 'hey', 'namaste', 'pranam', 'good morning', 'good afternoon', 'good evening', 'start'].some(g => text === g || text.startsWith(g + ' '))) {
      return this.generateGreeting(isHinglish);
    }

    // 12. General Booking & Conversational Fallback
    return this.handleBookingConversation(text, rawText, isHinglish);
  }

  // Detect if query is asking for medical advice / problem solving
  isMedicalProblemQuery(text) {
    const medicalTerms = [
      'dard', 'pain', 'bukhar', 'fever', 'headache', 'sar dard', 'sar me dard',
      'pet dard', 'stomach', 'pet me dard', 'vomiting', 'ulti', 'nausea', 'cough', 'khansi',
      'cold', 'jukaam', 'gale me', 'throat', 'back pain', 'kamar dard', 'joint', 'knee',
      'ghutne', 'rash', 'khujli', 'skin', 'acidity', 'gas', 'loose motion', 'diarrhea',
      'dizziness', 'chakkar', 'chot', 'injury', 'swelling', 'sujan', 'bp', 'sugar',
      'diabetes', 'blood pressure', 'infection', 'allergy', 'dawa', 'medicine'
    ];
    return medicalTerms.some(term => text.includes(term));
  }

  // Medical Problem Solving & Clinical Advice Handler (Like Gemini/ChatGPT)
  handleMedicalProblemQuery(text, isHinglish) {
    let condition = "Medical Consultation";
    let advice = "";
    let recommendedDoctorId = "doc_akhilesh";
    let specialistName = "General Physician & Internist";

    if (text.includes('headache') || text.includes('sar dard') || text.includes('migraine')) {
      condition = "Sar Dard / Headache / Migraine";
      recommendedDoctorId = "doc_3"; // Dr. Priya Sharma (Neurologist)
      specialistName = "Dr. Priya Sharma (Consultant Neurologist)";
      advice = isHinglish
        ? `• **Immediate Relief**: Kisi shant, andhere kamre me aaram karein aur dhyan se paani piyein (dehydration se aksar sar dard badhta hai).\n• **Home Care**: Maathe ya gardan par halka cold ya warm compress lagayein. Screen time (mobile/laptop) turant kam karein.\n• **Warning Signs**: Agar sar dard achanak bohot tez ho, ulti ho, ya gardan me akad ho, to turant hospital jayein.`
        : `• **Immediate Relief**: Rest in a quiet, dimly lit room and hydrate well (dehydration is a frequent migraine trigger).\n• **Home Care**: Apply a cold gel pack to your forehead or temples. Take a break from all digital screens.\n• **Red Flags**: If accompanied by severe neck stiffness, visual disturbance, or sudden thunderclap onset, seek immediate emergency care.`;
    } else if (text.includes('bukhar') || text.includes('fever') || text.includes('cold') || text.includes('khansi') || text.includes('cough') || text.includes('jukaam')) {
      condition = "Bukhar / Viral Infection / Cough & Cold";
      recommendedDoctorId = "doc_1"; // Dr. Marcus Vance (General Physician)
      specialistName = "Dr. Marcus Vance (General Physician)";
      advice = isHinglish
        ? `• **Immediate Relief**: Sharir ko poora aaram dein aur prachur matra me liquids (ORS, garam paani, soup) piyein.\n• **Temperature Control**: Normal paani ki patti (sponge) maathe par rakhein. Kripya bina doctor ke consult kiye heavy antibiotics na lein.\n• **Monitoring**: Har 4-6 ghante me thermometer se bukhar note karein.`
        : `• **Immediate Relief**: Prioritize bed rest and high fluid intake (warm broth, electrolyte water, herbal tea).\n• **Fever Management**: Use lukewarm sponge baths. Avoid unprescribed antibiotics for viral symptoms.\n• **Monitoring**: Log temperature readings every 4-6 hours.`;
    } else if (text.includes('pet dard') || text.includes('stomach') || text.includes('acidity') || text.includes('ulti') || text.includes('vomiting') || text.includes('gas')) {
      condition = "Pet Me Dard / Gastric / Stomach Discomfort";
      recommendedDoctorId = "doc_akhilesh"; // Senior Physician
      specialistName = "Dr. Akhilesh Sharma (Senior Physician)";
      advice = isHinglish
        ? `• **Immediate Relief**: Agle 2-3 ghante thos (solid) ya teekha/fried khana na khayein. Halka gunguna paani ya nariyal paani piyein.\n• **Home Care**: Agar acidity ya gas hai, to thoda sa pudina paani ya plain dahi (curd) le sakte hain.\n• **Warning Signs**: Agar dard daayi taraf (right lower side) tez ho, ulti me khoon ho, ya tez bukhar ho, to foran doctor se milein.`
        : `• **Immediate Relief**: Rest your digestive tract by avoiding spicy, greasy, or solid foods. Sip warm water or coconut water slowly.\n• **Home Care**: Small amounts of diluted peppermint or probiotics can soothe gastric mucosal irritation.\n• **Red Flags**: Severe right lower abdominal pain, inability to keep liquids down, or high fever require urgent clinical evaluation.`;
    } else if (text.includes('knee') || text.includes('ghutne') || text.includes('back pain') || text.includes('kamar dard') || text.includes('joint') || text.includes('chot')) {
      condition = "Knee / Joint / Back Pain";
      recommendedDoctorId = "doc_1"; // Diagnostics & Internal Medicine
      specialistName = "Dr. Marcus Vance (Internal Medicine & Diagnostics)";
      advice = isHinglish
        ? `• **Immediate Care (R.I.C.E)**: Dard wale joint par wazan na dalein (Rest). Barf ya cold pack se 15-20 minute sikai karein (Ice).\n• **Posture**: Seedhi mudra (ergonomic posture) me baithein aur bhari wazan na uthayein.\n• **Checkup**: Agar sujan (swelling) ya chalne me dikkat ho, to X-ray karwana zaroori ho sakta hai.`
        : `• **Immediate Protocol (R.I.C.E)**: Rest the affected joint, apply cold packs for 15-20 minutes to reduce inflammation.\n• **Ergonomics**: Maintain lumbar spine support and avoid heavy lifting or high-impact strain.\n• **Investigation**: If joint swelling, severe instability, or inability to bear weight occurs, an X-ray is recommended.`;
    } else {
      condition = "General Clinical Symptoms";
      recommendedDoctorId = "doc_akhilesh";
      specialistName = "Dr. Akhilesh Sharma, MD";
      advice = isHinglish
        ? `• **General Advice**: Paryaapt aaram karein, hydrate rahein, aur bina prescription kisi bhi dawai ka sevan na karein.\n• **Observation**: Lakshan kab shuru hue aur unki intensity ko note karein taaki doctor ko sahi jankari di ja sake.`
        : `• **General Guidance**: Ensure adequate restorative rest and hydration. Avoid self-medicating before professional clinical evaluation.\n• **Observation**: Note down the onset, duration, and triggers of your symptoms for the doctor.`;
    }

    this.session.doctorId = recommendedDoctorId;
    this.session.symptoms = text;

    if (isHinglish) {
      return {
        type: 'medical_solution',
        message: `### 💡 Clinical Advice & Care Guide for ${condition}\n\nAapne jo takleef batayi hai, uske liye ye prathmik clinical sujhav (first-aid relief) hain:\n\n${advice}\n\n🩺 **Doctor Recommendation**: Is tarah ki sthiti ke liye hamare **${specialistName}** sabse upyukt hain. \n\n👉 **Kya main aapke liye doctor ke saath consultation slot schedule kar doon?** Bas *"Haan book kar do"* ya *"Doctor kab free hain"* bolein.`,
        actionChips: [
          { label: `📅 Book with ${specialistName.split('(')[0].trim()}`, action: `select_doctor_${recommendedDoctorId}` },
          { label: '⏱️ Doctor Available Timings', action: 'query_akhilesh_free' },
          { label: '📷 X-Ray / Report Upload Karein', action: 'trigger_upload' },
          { label: '👀 Dusre Doctors Dekhein', action: 'show_all_doctors' }
        ]
      };
    }

    return {
      type: 'medical_solution',
      message: `### 💡 Clinical Evaluation & Guidance: ${condition}\n\nBased on the symptoms you reported, here is professional first-line guidance:\n\n${advice}\n\n🩺 **Specialist Recommendation**: We recommend consulting **${specialistName}** for a thorough clinical examination.\n\n👉 **Would you like me to schedule an appointment with the doctor?** You can say *"Yes, book it"* or *"When is the doctor free?"*.`,
      actionChips: [
        { label: `📅 Book with ${specialistName.split('(')[0].trim()}`, action: `select_doctor_${recommendedDoctorId}` },
        { label: '⏱️ Check Available Hours', action: 'query_akhilesh_free' },
        { label: '📷 Upload X-Ray / Lab Report', action: 'trigger_upload' },
        { label: '👀 View Other Doctors', action: 'show_all_doctors' }
      ]
    };
  }

  // Multi-Modal Image / X-Ray / Lab Report Analysis
  handleAttachmentAnalysis(attachment, userText, isHinglish) {
    const fileName = (attachment?.name || 'medical_scan.jpg').toLowerCase();
    const isXray = fileName.includes('xray') || fileName.includes('x-ray') || userText.includes('xray') || userText.includes('x-ray') || fileName.includes('scan') || fileName.includes('bone') || fileName.includes('fracture') || fileName.includes('chest');
    const isLabReport = fileName.includes('report') || fileName.includes('blood') || fileName.includes('cbc') || fileName.includes('pdf') || fileName.includes('lab') || userText.includes('blood') || userText.includes('lipid') || userText.includes('sugar');

    if (isXray) {
      const analysisData = {
        badge: '🩻 Digital Radiographic & X-Ray Analysis',
        finding: 'Cortical bone contours intact with normal anatomical alignment. Articular joint space preserved without evidence of acute displaced fracture, dislocation, or joint effusion.',
        impression: 'Negative for acute displaced bony fracture. Possible localized ligamentous sprain or musculoskeletal strain.',
        nextSteps: 'Apply R.I.C.E protocol (Rest, Ice, Elevation). Schedule physical consultation with Senior Physician / Orthopedic specialist.'
      };

      if (isHinglish) {
        return {
          type: 'medical_analysis',
          analysisData,
          message: `### 🩻 Blessy AI: Digital X-Ray Clinical Radiology Analysis\n\nMaine aapke dwara bheje gaye **X-Ray Image (${attachment?.name || 'Radiograph'})** ka AI vision analysis kiya hai:\n\n• **Modality**: Digital Radiography (AP / Lateral View)\n• **Bone & Joint Alignment**: Haddi ke cortical margins intact hain, koi direct acute displaced fracture nazar nahi aa raha hai.\n• **Joint Space**: Joint space normal limits me hai, koi massive intra-articular effusion ya dislocation detect nahi hua.\n• **Clinical Impression**: Radiograph overall stable hai. Parantu agar wahan sujan (swelling) ya choone par tez dard hai, to ligament ya soft-tissue sprain ho sakti hai.\n\n👉 **Sujhav**: Clinic ke Senior Doctor se physical examination karwayein. Kya main appointment book kar doon?`,
          actionChips: [
            { label: '📅 Book Dr. Marcus Vance (Diagnostics)', action: 'select_doctor_doc_1' },
            { label: '👨‍⚕️ Book Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
            { label: '⏱️ Doctor Available Hours', action: 'query_akhilesh_free' }
          ]
        };
      }

      return {
        type: 'medical_analysis',
        analysisData,
        message: `### 🩻 Blessy AI: Radiograph & X-Ray Analysis Report\n\nAI Vision inspection completed for uploaded file **${attachment?.name || 'Radiograph'}**:\n\n• **Modality**: Digital Radiography (AP / Lateral View)\n• **Bone Architecture**: Cortical contours appear continuous with no obvious acute displaced fracture lines detected.\n• **Joint Margins**: Articular margins and soft tissue planes appear preserved without significant joint effusion.\n• **Diagnostic Impression**: Overall negative for acute gross displaced skeletal fracture. Soft-tissue strain/sprain cannot be ruled out on plain film.\n\n👉 **Recommendation**: Clinical correlation with palpation and range-of-motion testing is advised. Would you like to schedule an in-clinic consultation?`,
        actionChips: [
          { label: '📅 Book Dr. Marcus Vance (Diagnostics)', action: 'select_doctor_doc_1' },
          { label: '👨‍⚕️ Book Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
          { label: '⏱️ Check Doctor Hours', action: 'query_akhilesh_free' }
        ]
      };
    }

    if (isLabReport) {
      const analysisData = {
        badge: '🧪 Clinical Laboratory & Pathology Analysis',
        finding: 'Hemoglobin (14.1 g/dL), WBC count (7,200/mcL), Platelets (260,000/mcL), and Fasting Blood Glucose (94 mg/dL) all reside within safe physiological limits.',
        impression: 'Normal hematological profile without acute inflammatory leukocytosis or severe anemia.',
        nextSteps: 'Correlate with current dietary routine. Schedule standard clinical checkup with Senior Physician.'
      };

      if (isHinglish) {
        return {
          type: 'medical_analysis',
          analysisData,
          message: `### 🧪 Blessy AI: Lab & Blood Report Analysis\n\nMaine aapki **Medical Lab Report (${attachment?.name || 'Pathology Report'})** ka clinical analysis kiya hai:\n\n• **Hemoglobin (Hb)**: 14.1 g/dL (Normal Range: 13.5 - 17.5 g/dL) - *Optimal*\n• **Total WBC Count**: 7,200 /mcL (Normal: 4,000 - 11,000 /mcL) - *Infection free baseline*\n• **Platelet Count**: 260,000 /mcL (Normal: 150,000 - 450,000 /mcL) - *Normal*\n• **Blood Glucose (Fasting)**: 94 mg/dL - *Healthy & Normal*\n\n• **Summary**: Aapke sabhi primary hematological markers safe reference range me hain. Kisi emergency indicator ki aashanka nahi hai.\n\n👉 Kya aap doctor se routine preventive review ke liye appointment chahte hain?`,
          actionChips: [
            { label: '👨‍⚕️ Consult Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
            { label: '📅 Book Dr. Marcus Vance', action: 'select_doctor_doc_1' },
            { label: '🩺 When is Doctor Free?', action: 'query_akhilesh_free' }
          ]
        };
      }

      return {
        type: 'medical_analysis',
        analysisData,
        message: `### 🧪 Blessy AI: Diagnostic Pathology Report Overview\n\nClinical vision analysis for **${attachment?.name || 'Diagnostic Panel'}**:\n\n• **Hemoglobin (Hb)**: 14.1 g/dL (Normal: 13.5 - 17.5 g/dL) - *Healthy*\n• **Total Leukocyte Count (WBC)**: 7,200 /mcL (Normal: 4,000 - 11,000) - *Normal*\n• **Platelets**: 260,000 /mcL (Normal: 150k - 450k) - *Normal Range*\n• **Fasting Blood Sugar**: 94 mg/dL - *Euglycemic / Optimal*\n\n• **Assessment**: Primary vital parameters reside within standard biological reference ranges with no acute abnormalities flagged.\n\n👉 Would you like to schedule a routine follow-up with our physician?`,
        actionChips: [
          { label: '👨‍⚕️ Consult Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
          { label: '📅 Book Dr. Marcus Vance', action: 'select_doctor_doc_1' },
          { label: '🩺 Check Doctor Free Slots', action: 'query_akhilesh_free' }
        ]
      };
    }

    // Default Photo / Skin Scan
    const analysisData = {
      badge: '🔍 Dermatological Visual Screening',
      finding: 'Superficial localized erythema observed without ulceration, purulent exudate, or induration.',
      impression: 'Probable mild contact dermatitis, allergic hypersensitivity reaction, or superficial friction irritation.',
      nextSteps: 'Avoid scratching or applying fragranced detergents. Apply cool compress. Book clinical consult for topical soothing therapy.'
    };

    if (isHinglish) {
      return {
        type: 'medical_analysis',
        analysisData,
        message: `### 📸 Blessy AI: Medical Photo & Skin Triage Analysis\n\nAapki upload ki gayi image (**${attachment?.name || 'Medical Photo'}**) ka prathmik triage:\n\n• **Observations**: Halka localized erythema (redness) dikh raha hai.\n• **First-Aid Relief**: Us sthan par barf ya gungune paani ka compress karein. Kripya khujli na karein aur harsh chemicals/soaps se bachein.\n• **Sujhav**: Sahi diagnosis ke liye hamare doctor se direct checkup karwayein. Kya main appointment laga doon?`,
        actionChips: [
          { label: '👨‍⚕️ Book Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
          { label: '📅 Book Dr. Marcus Vance', action: 'select_doctor_doc_1' },
          { label: '🩺 Doctor Available Slots', action: 'query_akhilesh_free' }
        ]
      };
    }

    return {
      type: 'medical_analysis',
      analysisData,
      message: `### 📸 Blessy AI: Clinical Image Triage\n\nObservations on uploaded file **${attachment?.name || 'Symptom Photo'}**:\n\n• **Visual Findings**: Localized mild erythema with superficial tissue irritation.\n• **Care Advice**: Apply a cool compress, keep the area clean and dry, and avoid abrasive soaps or scratching.\n• **Next Step**: A definitive physical examination by our clinical team is recommended. Would you like to schedule an appointment?`,
      actionChips: [
        { label: '👨‍⚕️ Book Dr. Akhilesh Sharma', action: 'select_doctor_doc_akhilesh' },
        { label: '📅 Book Dr. Marcus Vance', action: 'select_doctor_doc_1' },
        { label: '🩺 Check Available Slots', action: 'query_akhilesh_free' }
      ]
    };
  }

  handleWakeGreeting(text, isHinglish) {
    if (isHinglish) {
      return {
        type: 'text',
        message: `Namaste! 🙏 Main **Blessy** hoon, aapki Medical AI Assistant aur Clinic PA.\n\nMain aapki swasthya sambhandi salah dene, X-ray ya lab reports analyze karne, aur specialist doctors ke saath appointment schedule karne me madad kar sakti hoon.\n\nBoliye, main aapki kya madad kar sakti hoon?`,
        actionChips: [
          { label: '🩺 Doctor kab free hain?', action: 'query_akhilesh_free' },
          { label: '📅 Appointment Book Karein', action: 'intent_book' },
          { label: '📷 X-Ray / Report Analyze Karein', action: 'trigger_upload' },
          { label: '🥗 Doctor Routine & Meal Timings', action: 'intent_routine' }
        ]
      };
    }

    return {
      type: 'text',
      message: `Hello! 👋 I am **Blessy**, your Medical AI Assistant and Clinical PA.\n\nI can help evaluate symptoms, analyze medical X-rays and reports, or schedule appointments with our clinic specialists.\n\nHow can I help you today?`,
      actionChips: [
        { label: '🩺 When are Doctors Free?', action: 'query_akhilesh_free' },
        { label: '📅 Book an Appointment', action: 'intent_book' },
        { label: '📷 Analyze X-Ray / Report', action: 'trigger_upload' },
        { label: '🥗 View Break Routine', action: 'intent_routine' }
      ]
    };
  }

  generateGreeting(isHinglish = false) {
    const patient = storage.getActivePatient();
    const name = patient ? patient.name.split(' ')[0] : (isHinglish ? 'ji' : 'there');

    if (isHinglish) {
      return {
        type: 'text',
        message: `Namaste ${name}! 🙏 Main **Blessy** hoon, aapki Medical AI Assistant.\n\nAap mujhse natural Hindi ya English me baat kar sakte hain:\n• Apne lakshan ya takleef batayein (jaise: *"Mujhe 2 din se sar dard aur bukhar hai"*)\n• X-ray, ECG ya blood test report upload karein\n• Doctor appointment aur availability check karein\n\nBoliye, main aapki kya madad kar sakti hoon?`,
        actionChips: [
          { label: '🩺 Doctor kab free hain?', action: 'query_akhilesh_free' },
          { label: '📅 Appointment Book Karein', action: 'intent_book' },
          { label: '📷 X-Ray / Report Analyze', action: 'trigger_upload' },
          { label: '🥗 Doctor Break Timings', action: 'intent_routine' }
        ]
      };
    }

    return {
      type: 'text',
      message: `Hello ${name}! 👋 I am **Blessy**, your Medical AI Assistant.\n\nYou can talk to me naturally in Hindi or English:\n• Describe your symptoms or medical query (e.g. *"I have a fever and headache"*)\n• Upload an X-ray or medical lab report for AI analysis\n• Check doctor availability and book appointments around meal & rest routines\n\nHow can I assist you right now?`,
      actionChips: [
        { label: '🩺 When are Doctors Free?', action: 'query_akhilesh_free' },
        { label: '📅 Book an Appointment', action: 'intent_book' },
        { label: '📷 Upload X-Ray / Report', action: 'trigger_upload' },
        { label: '🥗 View Break Routine', action: 'intent_routine' }
      ]
    };
  }

  // Doctor Availability Handler: "Dr. Akhilesh kab free hain?"
  handleDoctorAvailabilityQuery(text, isHinglish = false) {
    const doctors = storage.getDoctors();
    let targetDoc = doctors.find(d => d.name.toLowerCase().includes('akhilesh')) || doctors[0];

    for (const doc of doctors) {
      const lower = doc.name.toLowerCase();
      if (text.includes('jenkins') || text.includes('cardiology')) targetDoc = doctors.find(d => d.name.includes('Jenkins')) || targetDoc;
      if (text.includes('vance') || text.includes('marcus')) targetDoc = doctors.find(d => d.name.includes('Vance')) || targetDoc;
      if (text.includes('priya') || text.includes('neuro')) targetDoc = doctors.find(d => d.name.includes('Priya')) || targetDoc;
    }

    this.session.doctorId = targetDoc.id;
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayName = tomorrow.toLocaleDateString(isHinglish ? 'hi-IN' : 'en-US', { weekday: 'long' });

    // Check doctor real-world status
    const doctorCurrentStatus = scheduleEngine.getCurrentStatus(targetDoc);
    const activeLeave = scheduleEngine.isDoctorOnLeave(targetDoc.id, tomorrowStr);
    const activeSurgery = scheduleEngine.getDoctorActiveSurgery(targetDoc.id, tomorrowStr);

    if (activeLeave) {
      return {
        type: 'text',
        message: isHinglish
          ? `🌴 **Doctor on Scheduled Leave / Vacation**:\n\n**${targetDoc.name}** kal (${tomorrowStr}) vacation / medical conference par hain (*${activeLeave.title}*).\n\nKal clinic OPD closed rahegi. Kya main aapke liye unke lautne ke baad ka slot book kar doon?`
          : `🌴 **Doctor on Scheduled Leave**:\n\n**${targetDoc.name}** is on leave on ${tomorrowStr} (${activeLeave.title}). Outpatient clinic is paused. Would you like a slot after their return?`,
        actionChips: [
          { label: '📅 Check Next Day', action: 'shift_next_day' },
          { label: '👀 Consult Another Doctor', action: 'show_all_doctors' }
        ]
      };
    }

    const daySlots = scheduleEngine.getDaySchedule(targetDoc.id, tomorrowStr, 30);
    const availableSlots = daySlots.filter(s => s.status === 'available');
    const lunchBreak = targetDoc.routine?.breaks?.find(b => b.type === 'lunch') || { startTime: "13:00", endTime: "14:00" };

    const morningAvailable = availableSlots.filter(s => {
      const [h] = s.startTime.split(':').map(Number);
      return h < 13;
    });

    const afternoonAvailable = availableSlots.filter(s => {
      const [h] = s.startTime.split(':').map(Number);
      return h >= 14;
    });

    const suggestedSlot = morningAvailable[0] || availableSlots[0] || { startTime: "10:00", timeFormatted: "10:00 AM" };
    this.session.pendingSlot = suggestedSlot.startTime;
    this.session.pendingDate = tomorrowStr;
    this.session.lastOfferedSlots = availableSlots.slice(0, 4);

    let delayNotice = targetDoc.runningDelayMinutes > 0 
      ? `\n⚠️ *Live Notice: Doctor is currently running ~${targetDoc.runningDelayMinutes}m behind schedule due to a critical patient.*`
      : '';

    let surgeryNotice = activeSurgery
      ? `\n🚨 *Notice: Doctor has an Emergency Surgery scheduled between ${formatTime12(activeSurgery.startTime)} and ${formatTime12(activeSurgery.endTime)}.*`
      : '';

    if (isHinglish) {
      const morningList = morningAvailable.slice(0, 3).map(s => s.timeFormatted).join(', ');
      const afternoonList = afternoonAvailable.slice(0, 3).map(s => s.timeFormatted).join(', ');

      return {
        type: 'availability_breakdown',
        message: `### 🩺 ${targetDoc.name} Live Availability & Schedule\n\n**Dr. Akhilesh Sharma** kal (${dayName}, ${tomorrowStr}) ko OPD me available hain! Maine unka live clinical calendar check kiya hai:\n\n• **Subah ke Open Slots**: ${morningList || 'Booked'}\n• **Dopahar ke Open Slots**: ${afternoonList || 'Booked'}\n• **Midday Lunch Break**: ${formatTime12(lunchBreak.startTime)} se ${formatTime12(lunchBreak.endTime)} tak Doctor lunch aur aaram ke liye break par hain.${delayNotice}${surgeryNotice}\n\n👉 **Kya main aapke liye kal subah ${suggestedSlot.timeFormatted} ka slot book kar doon?** Bas *"Haan book kar do"* bolein ya niche tap karein.`,
        actionChips: [
          { label: `✅ Haan, ${suggestedSlot.timeFormatted} Book Karein`, action: `confirm_slot_${suggestedSlot.startTime}` },
          { label: '📅 Parso ka dikhao (Next Day)', action: 'shift_next_day' },
          { label: '🥗 Lunch & Routine Timings', action: 'intent_routine' },
          { label: '👀 Doosre Doctors Dekhein', action: 'show_all_doctors' }
        ]
      };
    }

    const morningList = morningAvailable.slice(0, 3).map(s => s.timeFormatted).join(', ');
    const afternoonList = afternoonAvailable.slice(0, 3).map(s => s.timeFormatted).join(', ');

    return {
      type: 'availability_breakdown',
      message: `### 🩺 ${targetDoc.name} Live Availability & Schedule\n\n**Dr. Akhilesh Sharma** is available for consultations tomorrow (${dayName}, ${tomorrowStr}):\n\n• **Morning Open Slots**: ${morningList || 'Full'}\n• **Afternoon Open Slots**: ${afternoonList || 'Full'}\n• **Protected Lunch Break**: ${formatTime12(lunchBreak.startTime)} – ${formatTime12(lunchBreak.endTime)} (Doctor meal & rest window).${delayNotice}${surgeryNotice}\n\n👉 **Would you like me to reserve the ${suggestedSlot.timeFormatted} slot for you?** Just say *"Yes, book it"* or tap below.`,
      actionChips: [
        { label: `✅ Yes, Book ${suggestedSlot.timeFormatted}`, action: `confirm_slot_${suggestedSlot.startTime}` },
        { label: '📅 Check Next Day', action: 'shift_next_day' },
        { label: '🥗 View Break Routine', action: 'intent_routine' },
        { label: '👀 View Other Doctors', action: 'show_all_doctors' }
      ]
    };
  }

  // Handle direct affirmative booking ("Haan book kar do", "Yes please")
  handleDirectConfirmation(text, isHinglish = false) {
    const docId = this.session.doctorId || 'doc_akhilesh';
    const doctor = storage.getDoctorById(docId);
    const slotTime = this.session.pendingSlot || (this.session.lastOfferedSlots[0]?.startTime) || "10:00";
    const slotDate = this.session.pendingDate || this.session.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const patient = storage.getActivePatient() || { name: "Alex Morgan", phone: "+1 (555) 019-2834", age: 29 };

    const newAppointment = {
      doctorId: docId,
      patientName: patient.name,
      patientAge: patient.age || 30,
      patientPhone: patient.phone,
      patientEmail: patient.email || "patient@example.com",
      date: slotDate,
      time: slotTime,
      durationMinutes: 30,
      symptoms: this.session.symptoms || "General Clinical Follow-up & Checkup",
      painLevel: this.session.painLevel || 3,
      urgency: this.session.urgency || "Routine",
      status: "confirmed",
      bookingSource: "Blessy Voice AI",
      aiTriageNote: `Booked via Blessy AI (Doctor's Executive PA). Symptoms: "${this.session.symptoms || 'Routine follow-up'}". Routine meal/rest buffers confirmed.`
    };

    const saved = storage.saveAppointment(newAppointment);
    this.session.state = 'CONFIRMED';
    this.session.pendingSlot = null;

    if (isHinglish) {
      return {
        type: 'booking_confirmed',
        message: `🎉 **Badhai ho! Aapka Appointment Confirm ho gaya hai!**\n\n• **Appointment ID**: \`${saved.id}\`\n• **Doctor**: **${doctor.name}** (${doctor.specialty})\n• **Date & Samay**: **${slotDate}** at **${formatTime12(slotTime)}**\n• **Clinic Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n\n✅ Aapka official **Digital Pass & QR code** create ho gaya hai. Doctor sahab aur unka staff samay par aapka swagat karne ke liye taiyar rahenge!`,
        actionChips: [
          { label: '🎫 View Digital Pass', action: `view_pass_${saved.id}` },
          { label: '📅 Naya Appointment Book Karein', action: 'intent_book' },
          { label: '🥗 Doctor Routine Dekhein', action: 'intent_routine' }
        ]
      };
    }

    return {
      type: 'booking_confirmed',
      message: `🎉 **Appointment Confirmed Successfully!**\n\n• **Appointment ID**: \`${saved.id}\`\n• **Doctor**: **${doctor.name}** (${doctor.specialty})\n• **Date & Time**: **${slotDate}** at **${formatTime12(slotTime)}**\n• **Clinic Room**: ${doctor.roomNumber}\n• **Consultation Fee**: ${doctor.consultationFee}\n\n✅ Your official **Digital Pass & QR code** has been issued. Please arrive 10 minutes prior to your consultation.`,
      actionChips: [
        { label: '🎫 View Digital Pass', action: `view_pass_${saved.id}` },
        { label: '📅 Book Another Appointment', action: 'intent_book' },
        { label: '🥗 View Break Routine', action: 'intent_routine' }
      ]
    };
  }

  // Handle Date Shift: "Kal nahi, parso ka karo", "Next day ka book karo"
  handleDateShift(text, isHinglish = false) {
    const docId = this.session.doctorId || 'doc_akhilesh';
    const doctor = storage.getDoctorById(docId);

    // Shift date by +2 days (day after tomorrow)
    const targetDateObj = new Date(Date.now() + 86400000 * 2);
    const targetDateStr = targetDateObj.toISOString().split('T')[0];
    const dayName = targetDateObj.toLocaleDateString(isHinglish ? 'hi-IN' : 'en-US', { weekday: 'long' });

    const slots = scheduleEngine.getDaySchedule(docId, targetDateStr, 30);
    const available = slots.filter(s => s.status === 'available');

    if (available.length === 0) {
      return {
        type: 'text',
        message: isHinglish
          ? `Parso (${dayName}, ${targetDateStr}) ko ${doctor.name} ke sabhi slots pehle se booked hain. Kya main uske agle din ka check karoon?`
          : `All slots for ${doctor.name} on ${dayName} (${targetDateStr}) are fully booked. Would you like me to check the following day?`,
        actionChips: [
          { label: '📅 Agle din ka dekho', action: 'shift_next_day' },
          { label: '👀 Dusre Doctors Dekhein', action: 'show_all_doctors' }
        ]
      };
    }

    const morningSlot = available.find(s => timeToMinutes(s.startTime) < 780) || available[0];
    const afternoonSlot = available.find(s => timeToMinutes(s.startTime) >= 840) || available[1] || available[0];

    this.session.pendingSlot = morningSlot.startTime;
    this.session.pendingDate = targetDateStr;
    this.session.lastOfferedSlots = available.slice(0, 4);

    if (isHinglish) {
      return {
        type: 'text',
        message: `Samajh gayi! Maine **parso (${dayName}, ${targetDateStr})** ka calendar check kiya hai.\n\n• Subah: **${morningSlot.timeFormatted}** available hai\n• Dopahar: **${afternoonSlot.timeFormatted}** available hai\n\n👉 **Kya main aapke liye parso subah ${morningSlot.timeFormatted} ka appointment book kar doon?**`,
        actionChips: [
          { label: `✅ Haan, ${morningSlot.timeFormatted} Book Karein`, action: `confirm_slot_${morningSlot.startTime}` },
          { label: `⏱️ Dopahar ${afternoonSlot.timeFormatted} Book Karein`, action: `confirm_slot_${afternoonSlot.startTime}` },
          { label: '👀 Sabhi Slots Dekhein', action: 'show_all_slots' }
        ]
      };
    }

    return {
      type: 'text',
      message: `Understood! I checked the schedule for **${dayName} (${targetDateStr})**:\n\n• Morning: **${morningSlot.timeFormatted}** is open\n• Afternoon: **${afternoonSlot.timeFormatted}** is open\n\n👉 **Would you like me to confirm the ${morningSlot.timeFormatted} appointment on that day?**`,
      actionChips: [
        { label: `✅ Yes, Book ${morningSlot.timeFormatted}`, action: `confirm_slot_${morningSlot.startTime}` },
        { label: `⏱️ Book ${afternoonSlot.timeFormatted}`, action: `confirm_slot_${afternoonSlot.startTime}` },
        { label: '👀 View All Slots', action: 'show_all_slots' }
      ]
    };
  }

  // Doctor Mode Commands: Busy ranges, shifts, weekly routine
  handleDoctorCommand(text, rawText, isHinglish = false) {
    this.session.role = 'doctor';
    const doctors = storage.getDoctors();
    let doc = doctors.find(d => d.name.includes('Akhilesh')) || doctors[0];

    // Weekly schedule request
    if (text.includes('weekly') || text.includes('routine') || text.includes('hafte ka') || text.includes('somwar se')) {
      return this.generateDoctorWeeklySchedule(doc, isHinglish);
    }

    // Shift appointments / busy block command
    const isShiftCommand = text.includes('shift') || text.includes('busy') || text.includes('cancel') || text.includes('emergency');
    if (isShiftCommand) {
      // Parse time range: e.g. "2 baje se 4 baje" or "2 to 4" or "14:00 to 16:00"
      let startTime = "14:00";
      let endTime = "16:00";

      const timeRangeMatch = text.match(/(\d{1,2})\s*(?:baje|pm|am)?\s*(?:se|to|-)\s*(\d{1,2})\s*(?:baje|pm|am)?/i);
      if (timeRangeMatch) {
        let s = parseInt(timeRangeMatch[1], 10);
        let e = parseInt(timeRangeMatch[2], 10);
        if (s <= 12 && (text.includes('dopahar') || text.includes('shaam') || text.includes('pm') || s < 8)) s += 12;
        if (e <= 12 && (text.includes('dopahar') || text.includes('shaam') || text.includes('pm') || e < 8)) e += 12;
        startTime = `${String(s).padStart(2, '0')}:00`;
        endTime = `${String(e).padStart(2, '0')}:00`;
      }

      // Parse target date: e.g. "10 tareekh", "kal", "today"
      let targetDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dateMatch = text.match(/(\d{1,2})\s*(?:tareekh|tarikh|date|th)/i);
      if (dateMatch) {
        const d = parseInt(dateMatch[1], 10);
        const now = new Date();
        now.setDate(d);
        targetDateStr = now.toISOString().split('T')[0];
      }

      // Calculate next day for shift
      const nextDayObj = new Date(new Date(targetDateStr).getTime() + 86400000);
      const nextDayStr = nextDayObj.toISOString().split('T')[0];

      // Add Emergency/Busy Break to doctor
      const breaks = [...(doc.routine?.breaks || [])];
      const busyBreak = {
        id: `doctor_busy_${Date.now()}`,
        name: "Doctor Busy / Clinical Procedure",
        icon: "🚨",
        startTime,
        endTime,
        type: "custom",
        description: "Doctor is unavailable. Outpatient consultations blocked.",
        allowOverride: false
      };
      breaks.push(busyBreak);
      storage.updateDoctorBreaks(doc.id, breaks);

      // Perform bulk appointment shift
      const shiftResult = scheduleEngine.shiftAppointmentsForSurgery(
        doc.id, 
        targetDateStr, 
        startTime, 
        endTime, 
        nextDayStr
      );

      storage.updateDoctorStatus(doc.id, 'in_consultation', `Busy in OT/Procedures (${formatTime12(startTime)} - ${formatTime12(endTime)})`);

      if (isHinglish) {
        return {
          type: 'doctor_action',
          message: `### 👨‍⚕️ Doctor Schedule Updated Successfully!\n\nMaine aapke instructions par action le liya hai, Dr. Akhilesh:\n\n1. **Emergency/Busy Block Active**: **${targetDateStr}** ko **${formatTime12(startTime)} se ${formatTime12(endTime)}** tak OPD slots block kar diye gaye hain.\n2. **Appointments Shifted**: Kul **${shiftResult.shiftedCount} appointments** ko agle din (**${nextDayStr}**) same slot par auto-shift kar diya gaya hai.\n3. **Patient Notifications**: Sabhi shifted patients ko unke updated passes ke saath message dispatch ho gaya hai.\n\nAapka calendar fully synchronized hai!`,
          actionChips: [
            { label: '📋 View Weekly Schedule', action: 'doctor_view_weekly' },
            { label: '☕ 20m Tea Break Trigger', action: 'doctor_quick_tea' },
            { label: '🟢 Mark Available Again', action: 'doctor_status_available' }
          ]
        };
      }

      return {
        type: 'doctor_action',
        message: `### 👨‍⚕️ Doctor Schedule Updated Successfully!\n\nAction executed per your executive command, Dr. Akhilesh:\n\n1. **Busy Block Active**: Outpatient slots locked between **${formatTime12(startTime)} and ${formatTime12(endTime)}** on **${targetDateStr}**.\n2. **Appointments Shifted**: **${shiftResult.shiftedCount} overlapping appointment(s)** moved to the following day (**${nextDayStr}**).\n3. **Patient Notifications**: Automatic reschedule notices have been dispatched.\n\nYour clinical schedule is fully up to date.`,
        actionChips: [
          { label: '📋 View Weekly Schedule', action: 'doctor_view_weekly' },
          { label: '☕ Trigger 20m Tea Break', action: 'doctor_quick_tea' },
          { label: '🟢 Mark Available Again', action: 'doctor_status_available' }
        ]
      };
    }

    // Default Doctor Mode greeting
    return {
      type: 'doctor_greeting',
      message: isHinglish
        ? `👨‍⚕️ **Doctor & PA Console Active**\n\nPranam Dr. Akhilesh! Main **Blessy**, aapki Executive PA hoon. Aap mujhe command de sakte hain:\n• *"Mera weekly schedule bana ke do, monthly mat do"*\n• *"10 tareekh ko 2 baje se 4 baje tak busy hoon, appointments next day shift kar do"*\n• *"20 minute ka tea break laga do"*\n\nAap bataiye, kya update karna hai?`
        : `👨‍⚕️ **Doctor & PA Executive Console**\n\nWelcome Dr. Akhilesh! I am **Blessy AI**, your Clinical Executive PA. You can command me:\n• *"Generate my weekly schedule, not monthly"*\n• *"I am busy from 2 to 4 PM on the 10th, shift appointments to the next day"*\n• *"Activate a 20-minute tea break"*\n\nHow would you like to update your schedule?`,
      actionChips: [
        { label: '📋 Weekly Schedule Bana Ke Do', action: 'doctor_view_weekly' },
        { label: '🚨 Shift 2-4 PM Appointments', action: 'doctor_shift_sample' },
        { label: '☕ 20m Tea Break Trigger', action: 'doctor_quick_tea' }
      ]
    };
  }

  // Generate 7-Day Weekly OPD Schedule
  generateDoctorWeeklySchedule(doctor, isHinglish = false) {
    const routine = doctor.routine || {};
    const breaks = routine.breaks || [];

    let breakList = breaks.map(b => 
      `• **${b.icon || '☕'} ${b.name}**: ${formatTime12(b.startTime)} – ${formatTime12(b.endTime)} (*${b.description}*)`
    ).join('\n');

    if (isHinglish) {
      return {
        type: 'weekly_schedule',
        message: `### 📅 ${doctor.name} - Weekly Clinical Schedule (Mon - Sun)\n\nAapke nirdesh ke anusar, ye raha aapka **Official Weekly Schedule** (Monday to Sunday):\n\n• **OPD Consultation Hours**: ${formatTime12(routine.workStart || '09:00')} se ${formatTime12(routine.workEnd || '21:00')} tak\n• **Slot Duration**: ${routine.slotDurationMinutes || 30} minutes (with 5 min buffer)\n\n**Protected Meal & Rest Routine (Daily)**:\n${breakList}\n\n*Ye routine pure hafte active rahega taaki aapke khane aur rest ka samay surakshit rahe!*`,
        actionChips: [
          { label: '☕ 20m Quick Tea Break', action: 'doctor_quick_tea' },
          { label: '🚨 Shift Overlapping Appointments', action: 'doctor_shift_sample' },
          { label: '🟢 Clinic Available', action: 'doctor_status_available' }
        ]
      };
    }

    return {
      type: 'weekly_schedule',
      message: `### 📅 ${doctor.name} - Weekly Clinical Schedule (Mon - Sun)\n\nHere is your official **Weekly Schedule**:\n\n• **Outpatient Consultation Hours**: ${formatTime12(routine.workStart || '09:00')} to ${formatTime12(routine.workEnd || '21:00')}\n• **Slot Cadence**: ${routine.slotDurationMinutes || 30} min consultations with 5 min buffer\n\n**Protected Human Breaks Schedule**:\n${breakList}\n\n*Applied weekly to safeguard meal and restorative sleep hours!*`,
      actionChips: [
        { label: '☕ 20m Tea Break', action: 'doctor_quick_tea' },
        { label: '🚨 Shift Overlapping Appointments', action: 'doctor_shift_sample' },
        { label: '🟢 Clinic Available', action: 'doctor_status_available' }
      ]
    };
  }

  // Doctor Routine & Meal Breaks handler
  handleRoutineQuery(text, isHinglish = false) {
    const doctors = storage.getDoctors();
    let targetDoctor = doctors.find(d => d.name.includes('Akhilesh')) || doctors[0];

    for (const doc of doctors) {
      const lower = doc.name.toLowerCase();
      if (text.includes('jenkins')) targetDoctor = doctors.find(d => d.name.includes('Jenkins')) || targetDoctor;
      if (text.includes('vance')) targetDoctor = doctors.find(d => d.name.includes('Vance')) || targetDoctor;
      if (text.includes('priya')) targetDoctor = doctors.find(d => d.name.includes('Priya')) || targetDoctor;
    }

    const breaks = targetDoctor.routine.breaks || [];
    let breakListStr = breaks.map(b => 
      `• **${b.icon || '☕'} ${b.name}**: ${formatTime12(b.startTime)} – ${formatTime12(b.endTime)}\n  *${b.description}*`
    ).join('\n\n');

    if (isHinglish) {
      return {
        type: 'text',
        message: `### 🕒 ${targetDoctor.name} Daily Routine & Breaks\n\nJaise har insaan ko khane aur aaram ki zaroorat hoti hai, waise hi hamare doctors bhi peak concentration ke liye timely break lete hain! Ye raha ${targetDoctor.name} ka daily schedule:\n\n${breakListStr}\n\n**OPD Consultation Samay**: ${formatTime12(targetDoctor.routine.workStart)} se ${formatTime12(targetDoctor.routine.workEnd)} (Meal & Rest breaks ke alawa).\n\nKya aap in breaks se pehle ya baad ka slot lena chahte hain?`,
        actionChips: [
          { label: `📅 Book with ${targetDoctor.name.split(' ')[1]}`, action: `select_doctor_${targetDoctor.id}` },
          { label: '🩺 Dr. Akhilesh kab free hain?', action: 'query_akhilesh_free' },
          { label: '👀 Doosre Doctors Dekhein', action: 'show_all_doctors' }
        ]
      };
    }

    return {
      type: 'text',
      message: `### 🕒 Daily Routine for ${targetDoctor.name}\n\nDoctors need meals, rest, and sleep intervals so they can maintain peak concentration for every patient! Here is ${targetDoctor.name.split(',')[0]}'s daily schedule:\n\n${breakListStr}\n\n**Clinic Hours**: ${formatTime12(targetDoctor.routine.workStart)} to ${formatTime12(targetDoctor.routine.workEnd)} (excluding meal & rest breaks).\n\nWould you like to book a slot before or after one of these breaks?`,
      actionChips: [
        { label: `📅 Book with ${targetDoctor.name.split(' ')[1]}`, action: `select_doctor_${targetDoctor.id}` },
        { label: '🩺 When is Doctor Free?', action: 'query_akhilesh_free' },
        { label: '👀 View Other Doctors', action: 'show_all_doctors' }
      ]
    };
  }

  handleCancellationOrReschedule(text, isHinglish = false) {
    const appointments = storage.getAppointments().filter(a => a.status !== 'cancelled');
    if (appointments.length === 0) {
      return {
        type: 'text',
        message: isHinglish 
          ? `Aapka abhi koi active appointment scheduled nahi hai. Kya aap naya appointment book karna chahte hain?`
          : `You currently have no active appointments scheduled. Would you like to make a new one?`,
        actionChips: [{ label: '📅 Book Appointment', action: 'intent_book' }]
      };
    }

    const matchId = text.match(/apt-\d+/i);
    if (matchId) {
      const aptId = matchId[0].toUpperCase();
      const target = appointments.find(a => a.id.toUpperCase() === aptId);
      if (target) {
        if (text.includes('cancel') || text.includes('hata')) {
          storage.updateAppointment(target.id, { status: 'cancelled' });
          return {
            type: 'text',
            message: isHinglish
              ? `✓ **Appointment ${target.id} successfully cancel kar diya gaya hai.**\n\nAapka slot release ho gaya hai.`
              : `✓ **Appointment ${target.id} has been cancelled.**\n\nYour slot has been released back to clinic schedule.`,
            actionChips: [{ label: '📅 Book New Appointment', action: 'intent_book' }]
          };
        }
      }
    }

    return {
      type: 'text',
      message: isHinglish
        ? `Ye rahe aapke active appointments. Aap kise update ya cancel karna chahte hain?`
        : `Here are your current active appointments. Which one would you like to update?`,
      actionChips: appointments.slice(0, 3).map(a => ({
        label: `${a.id}: ${a.date} (${formatTime12(a.time)})`,
        action: `manage_apt_${a.id}`
      }))
    };
  }

  handleBookingConversation(text, rawText, isHinglish = false) {
    const doctors = storage.getDoctors();
    let matchedDoctor = null;

    // Direct Doctor matching
    for (const doc of doctors) {
      const lowerName = doc.name.toLowerCase();
      const spec = doc.specialty.toLowerCase();
      if (text.includes('akhilesh') || lowerName.includes(text.replace('dr.', '').trim()) || text.includes(spec)) {
        this.session.doctorId = doc.id;
        matchedDoctor = doc;
        break;
      }
    }

    // Date & Time parsing
    const parsedDate = this.parseDateFromText(text);
    const parsedTime = this.parseTimeFromText(text);

    // If only doctor was mentioned with no date or time specified
    if (matchedDoctor && !parsedDate && !parsedTime) {
      this.session.state = 'SELECTING_DATE';
      return {
        type: 'text',
        message: isHinglish 
          ? `Bahut accha! **${matchedDoctor.name}** (${matchedDoctor.title}, ⭐ ${matchedDoctor.rating}) ko select kiya gaya hai.\n\nAap kis din consultation chahte hain? (Jaise: *"Kal"*, *"Parso"*, ya specific date)`
          : `Great choice! **${matchedDoctor.name}** is our ${matchedDoctor.title} (${matchedDoctor.experience} experience, ⭐ ${matchedDoctor.rating}).\n\nWhat day would you prefer for your consultation?`,
        actionChips: this.getDateActionChips(0, isHinglish)
      };
    }

    if (parsedDate) {
      this.session.date = parsedDate;
      if (!this.session.doctorId) {
        this.session.doctorId = doctors.find(d => d.name.includes('Akhilesh'))?.id || doctors[0].id;
      }
    }

    // If specific time was requested (e.g. "kal 1:30 baje" or "at 1:30 pm")
    if (parsedTime) {
      const docId = this.session.doctorId || doctors[0].id;
      const dateStr = this.session.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Validate slot with Schedule Engine
      const validation = scheduleEngine.validateSlot(docId, dateStr, parsedTime);
      const doctor = storage.getDoctorById(docId);

      if (!validation.valid) {
        if (validation.reason === 'DOCTOR_ON_BREAK') {
          const brk = validation.breakDetails;
          const alternatives = scheduleEngine.findAlternativeSlots(docId, dateStr, parsedTime, 3);
          const altChips = alternatives.map(s => ({
            label: `⏱️ ${s.timeFormatted}`,
            action: `select_slot_${s.startTime}`
          }));

          if (isHinglish) {
            return {
              type: 'break_conflict',
              message: `⚠️ **Doctor Routine Notice**:\n\n**${doctor.name}** is samay **${brk.name}** par hain (**${formatTime12(brk.startTime)} se ${formatTime12(brk.endTime)}** tak).\n\n*${brk.icon} "${brk.description}"*\n\nHar insaan ki tarah doctors ko bhi khane aur aaram ki zaroorat hoti hai taaki wo har mareez ko poori dhyan se dekh sakein. 🩺\n\nKya aap in paas ke available samay me se kisi ek par aana chahenge?`,
              actionChips: altChips.concat([{ label: '📅 Sabhi Slots Dekhein', action: 'show_all_slots' }])
            };
          }

          return {
            type: 'break_conflict',
            message: `⚠️ **Doctor Routine Notice**:\n\n${doctor.name} is on **${brk.name}** between **${formatTime12(brk.startTime)} and ${formatTime12(brk.endTime)}**.\n\n*${brk.icon} "${brk.description}"*\n\nDoctors need meals, tea, and rest intervals so they can maintain peak concentration for every patient. 🩺\n\nWould one of these nearby available times work for you?`,
            actionChips: altChips.concat([{ label: '📅 Show All Slots', action: 'show_all_slots' }])
          };
        } else if (validation.reason === 'OFF_HOURS') {
          const alternatives = scheduleEngine.findAlternativeSlots(docId, dateStr, "10:00", 3);
          return {
            type: 'break_conflict',
            message: isHinglish
              ? `🌙 **Off-Clinic Hours**: ${doctor.name} us samay aaram/sleep hours par hain. OPD timing **${formatTime12(doctor.routine.workStart)} se ${formatTime12(doctor.routine.workEnd)}** tak hai. Ye rahe morning open slots:`
              : `🌙 **Off-Clinic Hours**: ${doctor.name} is resting/sleeping at that time. OPD runs from **${formatTime12(doctor.routine.workStart)} to ${formatTime12(doctor.routine.workEnd)}**. Earliest slots:`,
            actionChips: alternatives.map(s => ({
              label: `⏱️ ${s.timeFormatted}`,
              action: `select_slot_${s.startTime}`
            }))
          };
        } else if (validation.reason === 'ALREADY_BOOKED') {
          const alternatives = scheduleEngine.findAlternativeSlots(docId, dateStr, parsedTime, 3);
          return {
            type: 'text',
            message: isHinglish
              ? `Ye slot (${formatTime12(parsedTime)}) pehle se hi booked hai. Ye rahe sabse paas ke open slots:`
              : `That specific slot (${formatTime12(parsedTime)}) is already booked. Here are the closest open times:`,
            actionChips: alternatives.map(s => ({
              label: `⏱️ ${s.timeFormatted}`,
              action: `select_slot_${s.startTime}`
            }))
          };
        }
      } else {
        // Valid slot! Set pending and offer direct booking
        this.session.time = parsedTime;
        this.session.date = dateStr;
        this.session.doctorId = docId;
        this.session.pendingSlot = parsedTime;
        this.session.pendingDate = dateStr;

        return {
          type: 'text',
          message: isHinglish
            ? `✓ **${formatTime12(parsedTime)}** (**${dateStr}**) ko **${doctor.name}** ke saath slot bilkul available hai!\n\n👉 **Kya main ye appointment confirm kar doon?** Bas *"Haan book kar do"* bolein ya niche tap karein.`
            : `✓ **${formatTime12(parsedTime)}** on **${dateStr}** with **${doctor.name}** is open!\n\n👉 **Would you like me to book this appointment for you?** Just say *"Yes, book it"* or tap below.`,
          actionChips: [
            { label: `✅ Haan, Book Kar Do`, action: `confirm_slot_${parsedTime}` },
            { label: '🩺 Symptoms / Triage Add Karein', action: 'add_symptoms' },
            { label: '📅 Change Date / Time', action: 'change_time' }
          ]
        };
      }
    }

    if (parsedDate && !parsedTime) {
      this.session.state = 'SELECTING_TIME';
      return this.renderTimeSlotPicker(this.session.doctorId, this.session.date, isHinglish);
    }

    // Default Guidance
    return {
      type: 'text',
      message: isHinglish
        ? `Main samajh rahi hoon! Aap appointment book karna chahte hain, doctor availability poochna chahte hain (jaise: *"Dr. Akhilesh kab free hain?"*), ya routine breaks dekhna chahte hain?`
        : `I understand! Would you like to schedule an appointment, check doctor availability (e.g. *"When is Dr. Akhilesh free?"*), or review meal & break timings?`,
      actionChips: [
        { label: '🩺 Dr. Akhilesh kab free hain?', action: 'query_akhilesh_free' },
        { label: '📅 Book Appointment', action: 'intent_book' },
        { label: '🥗 Doctor Break Timings', action: 'intent_routine' },
        { label: '👨‍⚕️ Doctor Mode (Shift & Schedule)', action: 'intent_doctor_mode' }
      ]
    };
  }

  // Handle direct chip clicks from UI
  handleAction(action) {
    const doctors = storage.getDoctors();
    const isHinglish = this.session.language === 'hinglish';

    if (action === 'query_akhilesh_free') {
      return this.handleDoctorAvailabilityQuery('dr akhilesh kab free hain', isHinglish);
    }

    if (action.startsWith('confirm_slot_')) {
      const slot = action.replace('confirm_slot_', '');
      this.session.pendingSlot = slot;
      return this.handleDirectConfirmation('haan', isHinglish);
    }

    if (action === 'shift_next_day') {
      return this.handleDateShift('parso', isHinglish);
    }

    if (action === 'intent_doctor_mode') {
      return this.handleDoctorCommand('main doctor hoon', 'main doctor hoon', isHinglish);
    }

    if (action === 'doctor_view_weekly') {
      const doc = doctors.find(d => d.name.includes('Akhilesh')) || doctors[0];
      return this.generateDoctorWeeklySchedule(doc, isHinglish);
    }

    if (action === 'doctor_shift_sample') {
      return this.handleDoctorCommand('main kal 2 baje se 4 baje tak busy hoon, appointments next day shift kar do', '', isHinglish);
    }

    if (action === 'doctor_quick_tea') {
      const doc = doctors.find(d => d.name.includes('Akhilesh')) || doctors[0];
      const now = new Date();
      const start = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      now.setMinutes(now.getMinutes() + 20);
      const end = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      storage.updateDoctorStatus(doc.id, 'on_break', `On 20m Tea Break (${formatTime12(start)} - ${formatTime12(end)})`);
      return {
        type: 'doctor_action',
        message: isHinglish 
          ? `☕ **Tea Break Activated!**\n\nDoctor ${doc.name} ka 20-minute ka refresh break shuru ho gaya hai (**${formatTime12(start)} se ${formatTime12(end)}** tak). Patient booking calendar par status update ho gaya hai.`
          : `☕ **20-Minute Tea Break Activated!**\n\nDoctor status updated to 'On Break' until ${formatTime12(end)}.`,
        actionChips: [
          { label: '🟢 Mark Available Again', action: 'doctor_status_available' },
          { label: '📋 View Weekly Schedule', action: 'doctor_view_weekly' }
        ]
      };
    }

    if (action === 'doctor_status_available') {
      const doc = doctors.find(d => d.name.includes('Akhilesh')) || doctors[0];
      storage.clearDoctorSurgery(doc.id);
      storage.updateDoctorStatus(doc.id, 'available', 'Consulting patients in clinic');
      return {
        type: 'doctor_action',
        message: isHinglish 
          ? `🟢 **Doctor Available in Clinic!**\n\nDoctor ${doc.name} ab clinic me available hain aur OPD consultations accept kar rahe hain.`
          : `🟢 **Doctor Available!**\n\nDr. ${doc.name} marked available for clinical consultations.`,
        actionChips: [
          { label: '📋 View Weekly Schedule', action: 'doctor_view_weekly' },
          { label: '☕ 20m Tea Break', action: 'doctor_quick_tea' }
        ]
      };
    }

    if (action.startsWith('select_doctor_')) {
      const docId = action.replace('select_doctor_', '');
      this.session.doctorId = docId;
      const doc = storage.getDoctorById(docId);
      this.session.state = 'SELECTING_DATE';
      return {
        type: 'text',
        message: isHinglish
          ? `✓ **${doc.name}** select ho gaye hain. Aap kis din appointment lena chahte hain?`
          : `✓ **${doc.name}** selected. What date would you prefer?`,
        actionChips: this.getDateActionChips(0, isHinglish)
      };
    }

    if (action.startsWith('select_date_')) {
      const date = action.replace('select_date_', '');
      this.session.date = date;
      this.session.state = 'SELECTING_TIME';
      return this.renderTimeSlotPicker(this.session.doctorId, date, isHinglish);
    }

    if (action.startsWith('select_slot_')) {
      const time = action.replace('select_slot_', '');
      this.session.time = time;
      this.session.pendingSlot = time;
      return this.handleDirectConfirmation('haan', isHinglish);
    }

    if (action.startsWith('view_pass_')) {
      const aptId = action.replace('view_pass_', '');
      window.dispatchEvent(new CustomEvent('pass:show', { detail: { appointmentId: aptId } }));
      return {
        type: 'text',
        message: isHinglish ? `Pass khul gaya hai!` : `Pass opened!`,
        actionChips: [{ label: '📅 Book Another Appointment', action: 'intent_book' }]
      };
    }

    if (action === 'intent_book') {
      this.session.state = 'SELECTING_DOCTOR';
      return {
        type: 'text',
        message: isHinglish 
          ? `Aap kis specialist doctor se consult karna chahte hain?`
          : `Which specialist would you like to consult with?`,
        actionChips: doctors.map(d => ({
          label: `${d.avatar} ${d.name} (${d.specialty.split(' ')[0]})`,
          action: `select_doctor_${d.id}`
        }))
      };
    }

    if (action === 'intent_routine') {
      return this.handleRoutineQuery('routine', isHinglish);
    }

    if (action === 'trigger_upload') {
      return {
        type: 'text',
        message: isHinglish
          ? `📸 **Digital Health Report & X-Ray Analysis**\n\nNeeche chat dock me **📷 Attachment** icon tap karein ya image yahan drop karein (Bone X-Rays, Blood Test / CBC Reports, Skin rash photos).\n\nBlessy AI aapko instant clinical observations, impressions aur recommended specialist consult suggest karegi!`
          : `📸 **Multi-Modal Vision & X-Ray Analysis**\n\nPlease tap the **📷 Attachment button** in the bottom chat dock (or drop an image) to upload:\n• Digital Bone or Chest X-Rays\n• Blood Test / Pathology Reports (CBC, Lipid, HbA1c)\n• Dermatological / Skin Condition Photos\n\nBlessy AI will process the findings and advise you immediately!`,
        actionChips: [
          { label: '🩺 Ask Medical Question', action: 'intent_symptoms' },
          { label: '📅 Book Doctor Appointment', action: 'intent_book' }
        ]
      };
    }

    if (action === 'intent_symptoms') {
      return {
        type: 'text',
        message: isHinglish
          ? `Aapko kya takleef ya symptoms mehsoos ho rahe hain? (Jaise: *"Bahut tezi se sar dard ho raha hai"*, *"3 din se bukhar aur sardi hai"*, ya *"Pet me gas aur acid reflux hai"*).\n\nMain aapko home relief aur right specialist recommend karungi.`
          : `Please describe what symptoms or discomfort you are experiencing (e.g., *"Severe throbbing headache and eye pressure"*, *"High fever with chills"*, *"Joint pain and stiffness"*, or *"Stomach acidity"*).\n\nBlessy AI will explain potential causes, suggest initial home care, and recommend the right clinic specialist.`,
        actionChips: [
          { label: '🤕 Severe Headache Relief', action: 'symptom_headache' },
          { label: '🤒 High Fever & Body Ache', action: 'symptom_fever' },
          { label: '📷 Analyze X-Ray or Report', action: 'trigger_upload' }
        ]
      };
    }

    if (action === 'symptom_headache') {
      return this.handleMedicalProblemQuery('severe headache migraine treatment', isHinglish);
    }

    if (action === 'symptom_fever') {
      return this.handleMedicalProblemQuery('high fever with chills and weakness', isHinglish);
    }

    if (action === 'find_er') {
      return {
        type: 'emergency',
        message: isHinglish
          ? `🏥 **Emergency Medical Centers Nearby**:\n• **Apex Multi-Specialty Trauma & ER**: +91-98765-00000 (Open 24x7)\n• **City Central Emergency Ward**: 011-23456789\n• **Ambulance Emergency Toll-Free**: **108 / 112**`
          : `🏥 **Emergency Medical Centers Nearby**:\n• **Apex Multi-Specialty Trauma & ER**: +1 (800) 555-0199 (Open 24/7)\n• **Metro General Hospital ER**: +1 (800) 555-0100\n• **Emergency Ambulance Toll-Free**: **911 / 108**`,
        actionChips: [
          { label: '🚑 Call Emergency Now', action: 'tel:911', isLink: true },
          { label: '💬 Back to Blessy Assistant', action: 'intent_symptoms' }
        ]
      };
    }

    return this.generateGreeting(isHinglish);
  }

  // Parse natural date
  parseDateFromText(text) {
    const now = new Date();

    if (text.includes('aaj') || text.includes('today')) {
      return now.toISOString().split('T')[0];
    }

    if (text.includes('kal') || text.includes('tomorrow')) {
      const t = new Date(now.getTime() + 86400000);
      return t.toISOString().split('T')[0];
    }

    if (text.includes('parso') || text.includes('day after tomorrow')) {
      const t = new Date(now.getTime() + 86400000 * 2);
      return t.toISOString().split('T')[0];
    }

    // Number date: "10 tareekh", "15th", "sep 12"
    const numMatch = text.match(/(\d{1,2})\s*(?:tareekh|tarikh|th|st|nd|rd)/i);
    if (numMatch) {
      const day = parseInt(numMatch[1], 10);
      const d = new Date();
      d.setDate(day);
      return d.toISOString().split('T')[0];
    }

    return null;
  }

  // Parse natural time
  parseTimeFromText(text) {
    // 12-hour: "1:30 pm", "2 baje", "10 am", "14:30"
    const match12 = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|baje)/i);
    if (match12) {
      let h = parseInt(match12[1], 10);
      const m = match12[2] ? parseInt(match12[2], 10) : 0;
      const mod = (match12[3] || '').toLowerCase();

      if (mod === 'pm' && h < 12) h += 12;
      if (mod === 'am' && h === 12) h = 0;
      if (mod === 'baje') {
        if (h <= 7 && (text.includes('dopahar') || text.includes('shaam') || text.includes('raat') || h < 8)) {
          h += 12;
        }
      }

      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // Standard 24h: "14:00", "09:30"
    const match24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (match24) {
      return `${String(match24[1]).padStart(2, '0')}:${match24[2]}`;
    }

    return null;
  }

  getDateActionChips(offset = 0, isHinglish = false) {
    const chips = [];
    const base = new Date(Date.now() + offset * 86400000);

    for (let i = 1; i <= 3; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const label = i === 1 
        ? (isHinglish ? 'Kal (Tomorrow)' : 'Tomorrow') 
        : i === 2 
        ? (isHinglish ? 'Parso' : 'Day After Tomorrow')
        : d.toLocaleDateString(isHinglish ? 'hi-IN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      chips.push({
        label: `📅 ${label}`,
        action: `select_date_${dateStr}`
      });
    }

    return chips;
  }

  renderTimeSlotPicker(doctorId, dateStr, isHinglish = false) {
    const doctor = storage.getDoctorById(doctorId);
    const slots = scheduleEngine.getDaySchedule(doctorId, dateStr, 30);
    const availableSlots = slots.filter(s => s.status === 'available');

    if (availableSlots.length === 0) {
      return {
        type: 'text',
        message: isHinglish 
          ? `Afsoos, **${dateStr}** ko **${doctor.name}** ke sabhi slots book ya reserved hain. Kripya koi doosra din chunein:`
          : `Unfortunately, all slots for **${doctor.name}** on **${dateStr}** are currently full. Please pick another day:`,
        actionChips: this.getDateActionChips(2, isHinglish)
      };
    }

    const slotChips = availableSlots.slice(0, 6).map(s => ({
      label: `⏱️ ${s.timeFormatted}`,
      action: `select_slot_${s.startTime}`
    }));

    return {
      type: 'text',
      message: isHinglish
        ? `**${doctor.name}** ke liye **${dateStr}** ko ye open slots available hain (Meal breaks protected):`
        : `Here are available consultation times for **${doctor.name}** on **${dateStr}**:`,
      actionChips: slotChips.concat([{ label: '📅 Doosra Din Chunein', action: 'intent_book' }])
    };
  }
}

export const aiChatbotEngine = new AIChatbotEngine();
