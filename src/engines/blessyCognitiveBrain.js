// Blessy Cognitive Brain: Generative Medical Reasoning, Semantic Knowledge & LLM Adapter (Like ChatGPT & Gemini)
import { storageService } from '../services/storageService.js';

export class BlessyCognitiveBrain {
  constructor() {
    this.geminiApiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || null;
  }

  // Detect open-ended medical questions, why/how queries, home care, and conceptual health inquiries
  isMedicalCognitiveQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase().trim();

    // 1. "Why / How / Causes" questions
    const causalPatterns = [
      'why does', 'why do', 'what causes', 'cause of', 'reason for', 'why is my',
      'kyu hota hai', 'kyun hota hai', 'karan kya hai', 'kyu hoti hai', 'vajah kya hai',
      'क्यों होता है', 'क्यों होती है', 'कारण क्या है', 'वजह क्या है'
    ];
    const isCausal = causalPatterns.some(p => lower.includes(p));

    // 2. "Home remedies / What to do / Diet" questions
    const remedyPatterns = [
      'home remedy', 'home remedies', 'gharelu nuskhe', 'gharelu upay', 'kya karein',
      'what should i do', 'what to eat', 'kya khana chahiye', 'kya parhez', 'how to treat at home',
      'घरेलू नुस्खे', 'घरेलू उपाय', 'क्या खाना चाहिए', 'क्या करें'
    ];
    const isRemedy = remedyPatterns.some(p => lower.includes(p));

    // 3. Medical concept / Difference questions
    const conceptPatterns = [
      'difference between', 'what is the difference', 'kab consult karein', 'when should i see a',
      'cardiologist or physician', 'specialist vs', 'क्या अंतर है', 'कब दिखाना चाहिए'
    ];
    const isConcept = conceptPatterns.some(p => lower.includes(p));

    return isCausal || isRemedy || isConcept;
  }

  // Live Generative AI Medical Reasoning via OpenRouter & GPT-4o-mini Backend
  async answerMedicalQueryLive(text, langParam = 'english', patientMemory = null) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          language: langParam,
          context: {
            patientName: patientMemory?.profile?.name || '',
            conditions: patientMemory?.chronicConditions || []
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.message) {
          const isHindi = langParam === 'hindi';
          return {
            type: 'cognitive_medical_answer',
            category: 'generative_ai',
            modelUsed: data.modelUsed || 'openai/gpt-4o-mini',
            message: data.message,
            actionChips: isHindi ? [
              { label: '🩺 डॉक्टर सूची देखें', action: 'show_doctors' },
              { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' },
              { label: '👨‍⚕️ डॉ. अखिलेश शर्मा (MD)', action: 'select_doctor_doc_akhilesh' }
            ] : [
              { label: '🩺 Show Available Doctors', action: 'show_doctors' },
              { label: '📅 Book Appointment', action: 'book_appointment' },
              { label: '👨‍⚕️ Dr. Akhilesh Sharma (MD)', action: 'select_doctor_doc_akhilesh' }
            ]
          };
        }
      }
    } catch (err) {
      console.warn("Live AI chat fallback to local knowledge base:", err.message);
    }

    // High-resilience fallback to local clinical knowledge
    return this.answerMedicalQuery(text, langParam, patientMemory);
  }

  // High-Precision Semantic Medical Reasoning Engine
  answerMedicalQuery(text, langParam = 'english', patientMemory = null) {
    const lang = langParam === 'hindi' ? 'hindi' : (langParam === 'hinglish' ? 'hinglish' : 'english');
    const lower = text.toLowerCase();

    // Contextual personalization based on patient memory
    let memoryContextNote = '';
    if (patientMemory && patientMemory.chronicConditions && patientMemory.chronicConditions.length > 0) {
      if (lang === 'hindi') {
        memoryContextNote = `\n\n📌 *आपकी मेडिकल हिस्ट्री (${patientMemory.chronicConditions.join(', ')}) को ध्यान में रखते हुए अतिरिक्त सावधानी आवश्यक है।*`;
      } else if (lang === 'hinglish') {
        memoryContextNote = `\n\n📌 *Aapki recorded history (${patientMemory.chronicConditions.join(', ')}) ko dhyan mein rakhte hue extra precaution zaroori hai.*`;
      } else {
        memoryContextNote = `\n\n📌 *Taking into account your recorded profile (${patientMemory.chronicConditions.join(', ')}), additional clinical monitoring is recommended.*`;
      }
    }

    // A. Headaches / Migraine Mechanisms & Care
    if (lower.includes('headache') || lower.includes('sar dard') || lower.includes('sir dard') || lower.includes('migraine') || lower.includes('सिरदर्द')) {
      if (lang === 'hindi') {
        return {
          type: 'cognitive_medical_answer',
          category: 'headache',
          message: `🧠 **सिरदर्द और माइग्रेन के प्रमुख कारण एवं क्लिनिकल समझ:**\n\nसिरदर्द मुख्य रूप से तनाव (tension), अपर्याप्त नींद, पानी की कमी (dehydration), लंबे समय तक स्क्रीन देखने से आंखों पर दबाव, या तंत्रिका संवेदनशीलता (neurological sensitivity) के कारण होता है।\n\n💡 **प्राथमिक घरेलू राहत उपाय:**\n• एक शांत, मंद रोशनी वाले कमरे में विश्राम करें।\n• माथे या गर्दन के पीछे 15 मिनट ठंडी पट्टी (cold compress) रखें।\n• भरपूर मात्रा में पानी पिएं और कैफीन या तेज धूप से बचें।${memoryContextNote}\n\n> ℹ️ *यह जानकारी सामान्य शिक्षा के लिए है। बार-बार होने वाले सिरदर्द की सही जांच एक न्यूरोलॉजिस्ट द्वारा ही संभव है।*\n\n🩺 **विशेषज्ञ सुझाव**: हमारे **Dr. Priya Sharma, MD** (वरिष्ठ न्यूरोलॉजिस्ट, Suite 302) इस समस्या के विशेषज्ञ हैं।\n\n👉 **क्या मैं डॉ. प्रिया शर्मा के साथ आपका अपॉइंटमेंट स्लॉट देखूँ?**`,
          actionChips: [
            { label: '✅ डॉ. प्रिया शर्मा से मिलें', action: 'select_doctor_doc_priya' },
            { label: '⏱️ कल 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ कल 04:00 PM', action: 'confirm_time_16:00' },
            { label: '🩺 सभी डॉक्टर देखें', action: 'show_doctors' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'cognitive_medical_answer',
          category: 'headache',
          message: `🧠 **Sir Dard & Migraine ke Causes aur Clinical Samjh:**\n\nSar dard aamtaur par stress, dehydration, neend ki kami, screen time se strain, ya neurological triggers (migraine) ki wajah se hota hai.\n\n💡 **Immediate Home Care & Rahat:**\n• Shant aur thoda andhere kamre mein rest karein.\n• Maathe par cold compress ya thandi patti 15-20 minute lagayein.\n• Hydration banaye rakhein aur regular paani piyein.${memoryContextNote}\n\n> ℹ️ *Yeh information general awareness ke liye hai. Ek doctor iski proper jaanch kar sakte hain.*\n\n🩺 **Recommended Specialist**: Is takleef ke liye hamari **Dr. Priya Sharma, MD** (Consultant Neurologist, Suite 302) best expert hain.\n\n👉 **Kya main Dr. Priya Sharma ke saath appointment slot check karoon?**`,
          actionChips: [
            { label: '✅ Book Dr. Priya Sharma', action: 'select_doctor_doc_priya' },
            { label: '⏱️ Kal 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ Kal 04:00 PM', action: 'confirm_time_16:00' },
            { label: '👀 Sabhi Doctors Dekhein', action: 'show_doctors' }
          ]
        };
      }

      return {
        type: 'cognitive_medical_answer',
        category: 'headache',
        message: `🧠 **Clinical Understanding: Causes of Headaches & Migraines**\n\nHeadaches typically stem from muscle contraction/tension, dehydration, sustained screen glare, inadequate sleep, or neurovascular triggers (migraine).\n\n💡 **Recommended Self-Care Measures:**\n• Rest in a quiet, dimly lit environment.\n• Apply a cold gel compress across temples or forehead for 15-20 minutes.\n• Rehydrate with electrolyte water and avoid skipped meals.${memoryContextNote}\n\n> ℹ️ *These symptoms can have different causes. A doctor can evaluate you properly.*\n\n🩺 **Specialist Guidance**: For recurrent headaches, we recommend consulting **Dr. Priya Sharma, MD** (Neurologist, Suite 302).\n\n👉 **Would you like me to check an available consultation slot with Dr. Priya?**`,
        actionChips: [
          { label: '✅ Book Dr. Priya Sharma', action: 'select_doctor_doc_priya' },
          { label: '⏱️ Tomorrow 11:30 AM', action: 'confirm_time_11:30' },
          { label: '⏱️ Tomorrow 04:00 PM', action: 'confirm_time_16:00' },
          { label: '👀 View All Doctors', action: 'show_doctors' }
        ]
      };
    }

    // B. Skin Allergies, Rash & Soap Sensitivity
    if (lower.includes('skin') || lower.includes('allergy') || lower.includes('rash') || lower.includes('khujli') || lower.includes('soap') || lower.includes('साबुन') || lower.includes('त्वचा')) {
      if (lang === 'hindi') {
        return {
          type: 'cognitive_medical_answer',
          category: 'skin',
          message: `🧴 **त्वचा की एलर्जी एवं खुजली के कारण और देखभाल:**\n\nत्वचा पर लाल चकत्ते और खुजली अक्सर केमिकल युक्त साबुन (contact dermatitis), मौसम में बदलाव, धूल-मिट्टी या किसी खाद्य पदार्थ से एलर्जिक रिएक्शन के कारण होते हैं।\n\n💡 **घरेलू देखभाल एवं सावधानियां:**\n• प्रभावित हिस्से पर सादा नारियल तेल या एलोवेरा जेल लगाएं।\n• किसी भी खुरदरे साबुन या केमिकल डिटर्जेंट के सीधे संपर्क से बचें।\n• त्वचा को खुजलाने या नोचने से बचें ताकि संक्रमण न फैले।${memoryContextNote}\n\n> ℹ️ *इन लक्षणों के कई अलग-अलग कारण हो सकते हैं। सही दवा के लिए डर्मेटोलॉजिस्ट की जांच आवश्यक है।*\n\n🩺 **अनुशंसित विशेषज्ञ**: हमारी **Dr. Ananya Roy, MD** (वरिष्ठ त्वचा रोग विशेषज्ञ, Suite 105) डर्मेटोलॉजी विभाग की प्रमुख हैं।\n\n👉 **क्या मैं डॉ. अनन्या रॉय के साथ आपका अपॉइंटमेंट स्लॉट देखूँ?**`,
          actionChips: [
            { label: '✅ डॉ. अनन्या रॉय से मिलें', action: 'select_doctor_doc_ananya' },
            { label: '⏱️ कल 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ कल 04:00 PM', action: 'confirm_time_16:00' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'cognitive_medical_answer',
          category: 'skin',
          message: `🧴 **Skin Allergy & Itching ke Causes aur Care:**\n\nSkin allergy aamtaur par kisi harsh soap/detergent (contact dermatitis), dust, synthetic kapde ya weather change ki wajah se hoti hai.\n\n💡 **Essential Home Care & Precautions:**\n• Affected skin ko dry aur clean rakhein.\n• Pure coconut oil ya mild moisturizer lagayein.\n• Itching ya scratch bilkul na karein taki secondary infection na ho.${memoryContextNote}\n\n> ℹ️ *In symptoms ke alag-alag causes ho sakte hain. Ek doctor iski proper jaanch kar sakte hain.*\n\n🩺 **Recommended Specialist**: Is problem ke liye hamari **Dr. Ananya Roy, MD** (Senior Dermatologist, Suite 105) upyukt rahengi.\n\n👉 **Kya main Dr. Ananya Roy ke saath appointment slot check karoon?**`,
          actionChips: [
            { label: '✅ Book with Dr. Ananya Roy', action: 'select_doctor_doc_ananya' },
            { label: '⏱️ Kal 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ Kal 04:00 PM', action: 'confirm_time_16:00' }
          ]
        };
      }

      return {
        type: 'cognitive_medical_answer',
        category: 'skin',
        message: `🧴 **Clinical Insight: Skin Irritation & Contact Dermatitis**\n\nSkin rashes and pruritus often arise from hypersensitivity reactions to fragrances, sulfates in soaps (contact dermatitis), dry climate, or topical irritants.\n\n💡 **Evidence-Based Supportive Care:**\n• Wash gently with plain lukewarm water; pat dry without friction.\n• Apply a bland, fragrance-free barrier emollient (such as pure coconut oil or ceramide lotion).\n• Strictly avoid scratching to prevent skin barrier breakdown.${memoryContextNote}\n\n> ℹ️ *These symptoms can have different causes. A doctor can evaluate you properly.*\n\n🩺 **Specialist Guidance**: We recommend consulting **Dr. Ananya Roy, MD** (Senior Dermatologist, Suite 105).\n\n👉 **Would you like me to check an available consultation slot with Dr. Ananya Roy?**`,
        actionChips: [
          { label: '✅ Book Dr. Ananya Roy', action: 'select_doctor_doc_ananya' },
          { label: '⏱️ Tomorrow 11:30 AM', action: 'confirm_time_11:30' },
          { label: '⏱️ Tomorrow 04:00 PM', action: 'confirm_time_16:00' }
        ]
      };
    }

    // C. Stomach Pain, Acidity & Digestion
    if (lower.includes('stomach') || lower.includes('pet') || lower.includes('acidity') || lower.includes('acid') || lower.includes('gas') || lower.includes('digestion') || lower.includes('पेट')) {
      if (lang === 'hindi') {
        return {
          type: 'cognitive_medical_answer',
          category: 'stomach',
          message: `🤢 **पेट दर्द और एसिडिटी के कारण एवं उपचार मार्गदर्शन:**\n\nएसिडिटी और पेट में जलन देर से भोजन करने, अत्यधिक तैलीय व मसालेदार खाने, चाय/कॉफी के अधिक सेवन, या पेट के एसिड के अन्नप्रणाली (esophagus) में वापस आने से होती है।\n\n💡 **प्राथमिक उपाय एवं खान-पान:**\n• ठंडा दूध, सौंफ का पानी या ओआरएस पिएं।\n• भोजन के तुरंत बाद न लेटें, कम से कम 2 घंटे बाद सोएं।\n• भारी भोजन की जगह हल्का व सुपाच्य आहार लें।${memoryContextNote}\n\n> ℹ️ *लगातार पेट दर्द अल्सर या संक्रमण का संकेत हो सकता है। डॉक्टर से जांच कराएं।*\n\n🩺 **विशेषज्ञ**: हमारे **Dr. Marcus Vance, MD** (वरिष्ठ फिजिशियन एवं गैस्ट्रो डायग्नोस्टिक्स, Suite 204) उपलब्ध हैं।\n\n👉 **क्या मैं डॉ. मार्कस वैंस के साथ आपका अपॉइंटमेंट स्लॉट देखूँ?**`,
          actionChips: [
            { label: '✅ डॉ. मार्कस वैंस से मिलें', action: 'select_doctor_doc_vance' },
            { label: '⏱️ कल 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ कल 04:00 PM', action: 'confirm_time_16:00' }
          ]
        };
      }

      if (lang === 'hinglish') {
        return {
          type: 'cognitive_medical_answer',
          category: 'stomach',
          message: `🤢 **Pet Dard & Acidity ke Causes aur Diet Tips:**\n\nAcidity aamtaur par spicy food, delayed meals, excess caffeine ya acid reflux (GERD) ki wajah se hoti hai.\n\n💡 **Relief Guidelines & Diet:**\n• Halka aur easily digestible khana lein (khichdi, oats, banana).\n• Khana khane ke turant baad na soyein; 2 ghante ka gap rakhein.\n• Gunguna paani ya thanda doodh sip karein.${memoryContextNote}\n\n> ℹ️ *In symptoms ke alag-alag causes ho sakte hain. Ek doctor iski proper jaanch kar sakte hain.*\n\n🩺 **Recommended Specialist**: Is problem ke liye hamare **Dr. Marcus Vance, MD** (Senior Internist & Diagnostician, Suite 204) upyukt rahenge.\n\n👉 **Kya main Dr. Marcus Vance ke saath appointment slot check karoon?**`,
          actionChips: [
            { label: '✅ Book with Dr. Marcus Vance', action: 'select_doctor_doc_vance' },
            { label: '⏱️ Kal 11:30 AM', action: 'confirm_time_11:30' },
            { label: '⏱️ Kal 04:00 PM', action: 'confirm_time_16:00' }
          ]
        };
      }

      return {
        type: 'cognitive_medical_answer',
        category: 'stomach',
        message: `🤢 **Clinical Insight: Gastric Discomfort & Acid Reflux**\n\nDyspepsia and gastric pyrosis are commonly triggered by delayed gastric emptying, hyperchlorhydria from spicy or high-fat meals, caffeine, or relaxed lower esophageal sphincter.\n\n💡 **Supportive Dietary & Postural Interventions:**\n• Ingest small, frequent bland meals (oatmeal, bananas, boiled rice).\n• Maintain an upright posture for at least 2 hours postprandially.\n• Sip room-temperature water or oral hydration solution.${memoryContextNote}\n\n> ℹ️ *These symptoms can have different causes. A doctor can evaluate you properly.*\n\n🩺 **Specialist Guidance**: We recommend consulting **Dr. Marcus Vance, MD** (Senior Diagnostician & Internist, Suite 204).\n\n👉 **Would you like me to check an available consultation slot with Dr. Marcus Vance?**`,
        actionChips: [
          { label: '✅ Book Dr. Marcus Vance', action: 'select_doctor_doc_vance' },
          { label: '⏱️ Tomorrow 11:30 AM', action: 'confirm_time_11:30' },
          { label: '⏱️ Tomorrow 04:00 PM', action: 'confirm_time_16:00' }
        ]
      };
    }

    // Default General Medical Explanation
    if (lang === 'hindi') {
      return {
        type: 'cognitive_medical_answer',
        category: 'general',
        message: `💡 **क्लिनिकल स्वास्थ्य जानकारी:**\n\nशरीर में किसी भी लक्षण का प्रकट होना प्रतिरक्षा प्रणाली (immune response) या जीवनशैली में बदलाव का संकेत हो सकता है।\n\n• पर्याप्त मात्रा में पानी पिएं और पर्याप्त नींद लें।\n• किसी भी लक्षण को नजरअंदाज न करें और स्व-दवा (self-medication) से बचें।${memoryContextNote}\n\n> ℹ️ *इन लक्षणों के कई अलग-अलग कारण हो सकते हैं। एक डॉक्टर इसकी सही जांच कर सकते हैं।*\n\n🩺 **विशेषज्ञ परामर्श**: हमारे मुख्य चिकित्सक **Dr. Akhilesh Sharma, MD** (Suite 101) प्राथमिक जांच के लिए उपलब्ध हैं।\n\n👉 **क्या मैं आपके लिए डॉक्टर अपॉइंटमेंट स्लॉट देखूँ?**`,
        actionChips: [
          { label: '🩺 सभी डॉक्टर देखें', action: 'show_doctors' },
          { label: '📅 अपॉइंटमेंट बुक करें', action: 'book_appointment' }
        ]
      };
    }

    if (lang === 'hinglish') {
      return {
        type: 'cognitive_medical_answer',
        category: 'general',
        message: `💡 **Clinical Health Insights:**\n\nBody mein koi bhi symptom immune response ya lifestyle imbalance ki wajah se trigger ho sakta hai.\n\n• Proper hydration aur restorative rest banaye rakhein.\n• Self-medication se bachein aur symptoms ko observe karein.${memoryContextNote}\n\n> ℹ️ *In symptoms ke alag-alag causes ho sakte hain. Ek doctor iski proper jaanch kar sakte hain.*\n\n🩺 **Recommended Doctor**: Hamare **Dr. Akhilesh Sharma, MD** (Chief Medical Consultant, Suite 101) primary evaluation ke liye available hain.\n\n👉 **Kya main aapke liye appointment slot check karoon?**`,
        actionChips: [
          { label: '🩺 Doctor panel dekhein', action: 'show_doctors' },
          { label: '📅 Appointment book karein', action: 'book_appointment' }
        ]
      };
    }

    return {
      type: 'cognitive_medical_answer',
      category: 'general',
      message: `💡 **Clinical Health Guidance:**\n\nHealth symptoms often reflect metabolic demands, immune responses, or physiological strain.\n\n• Ensure adequate hydration and 7-8 hours of sleep.\n• Avoid unprescribed medications and monitor symptom progression.${memoryContextNote}\n\n> ℹ️ *These symptoms can have different causes. A doctor can evaluate you properly.*\n\n🩺 **Recommended Specialist**: Our Chief Consultant **Dr. Akhilesh Sharma, MD** (Suite 101) is available for clinical evaluation.\n\n👉 **Would you like me to check an available consultation slot?**`,
      actionChips: [
        { label: '🩺 Show available doctors', action: 'show_doctors' },
        { label: '📅 Book appointment', action: 'book_appointment' }
      ]
    };
  }
}

export const blessyCognitiveBrain = new BlessyCognitiveBrain();
