// Blessy AI Service: Production-Grade Direct Google Gemini 3.8 Flash Adapter & Clinical Reasoner
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

const SYSTEM_PROMPT = `
You are "Blessy AI", an intelligent, empathetic, and clinical-grade AI Medical Assistant and Clinic Executive PA for HealthSync Clinic.

Key Guidelines:
1. Medical Triaging & Empathy:
   - Provide clear, safe, empathetic clinical explanations for symptoms (e.g., fever, headache, back pain, gastric issues, allergies).
   - Explain why symptoms happen, what immediate supportive home care (diet, hydration, posture, rest) can help, and when to seek urgent care.
   - Always clarify that your advice is supportive and not a substitute for an in-person physical doctor examination.
   
2. Doctor Specialist Matching:
   Our verified clinic specialist team:
   • Dr. Akhilesh Sharma, MD (Chief Physician & General Medicine, Room 101, Fee: ₹800) - For general health, fever, hypertension, diabetes.
   • Dr. Marcus Vance, MD (Diagnostics & Internal Medicine, Room 204, Fee: ₹1200) - For complex diagnostics, stomach/gut discomfort, chronic illness.
   • Dr. Priya Nair, MD (Cardiologist, Room 302, Fee: ₹1500) - For chest/heart health, palpitations, blood pressure.
   • Dr. Rajesh Patel, MS (Orthopedic Specialist, Room 105, Fee: ₹1000) - For joint pain, bone injuries, arthritis, back pain.
   • Dr. Sneha Kulkarni, MD (Pediatrician, Room 210, Fee: ₹750) - For child health, infant care, vaccinations.
   Recommend the appropriate specialist by name when relevant.

3. Multilingual Communication:
   - If the user writes or speaks in Hindi or Hinglish (e.g., "mujhe bukhar hai", "sar dard ho raha hai", "kya karu"), reply in warm, natural, and fluent Hinglish / Hindi.
   - If the user writes or speaks in English, reply in polished, professional English.

4. Formatting:
   - Use bold highlights, short bullet points, and clean structure.
   - Keep answers concise, actionable, and easy to read on mobile and desktop.
   - For voice mode, keep explanations conversational, clear, and direct.
`;

export async function askBlessyAI({ prompt, messages = [], history = [], language = 'auto', context = {}, systemPrompt: customSystemPrompt = null }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || GEMINI_API_KEY;

  if (!apiKey && !OPENROUTER_API_KEY) {
    throw new Error("Gemini API Key is missing in environment variables.");
  }

  // 1. Build System Instruction Context (use custom override if provided)
  let fullSystemPrompt = customSystemPrompt || SYSTEM_PROMPT.trim();
  if (!customSystemPrompt) {
    if (context.patientName) {
      fullSystemPrompt += `\n\nActive Patient Context: Name: ${context.patientName}, Known Conditions: ${context.conditions?.join(', ') || 'None reported'}.`;
    }
    if (language && language !== 'auto') {
      fullSystemPrompt += `\n\nTarget Output Language: ${language}.`;
    }
  }

  // 2. Build Gemini contents — prefer new `history` format (Gemini-native), else use legacy `messages`
  const contents = [];

  const turnsSource = (history && history.length > 0) ? history : messages;

  if (turnsSource && turnsSource.length > 0) {
    for (const m of turnsSource.slice(-8)) {
      // Support both Gemini-native format {role, parts} and legacy {sender/role, text/content}
      if (m.parts && Array.isArray(m.parts)) {
        // Already Gemini-native
        const role = m.role === 'model' ? 'model' : 'user';
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${m.parts[0]?.text || ''}`;
        } else {
          contents.push({ role, parts: [{ text: m.parts[0]?.text || '' }] });
        }
      } else {
        const text = (m.text || m.content || '').trim();
        if (!text) continue;
        const role = (m.sender === 'user' || m.role === 'user') ? 'user' : 'model';
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${text}`;
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }
    }
  }

  if (prompt && String(prompt).trim()) {
    const userPrompt = String(prompt).trim();
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n${userPrompt}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });
    }
  }

  // Safety fallback if contents is empty
  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hello, I need medical help.' }] });
  }

  // Ensure first turn is 'user' for Gemini API requirements
  if (contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Clinical Consultation Started' }] });
  }

  // Iterate through available Gemini models in resilient order
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGeminiAPI(apiKey, model, fullSystemPrompt, contents);
      return {
        success: true,
        message: result,
        modelUsed: model,
        provider: 'Google Gemini API',
        status: 'online'
      };
    } catch (modelErr) {
      console.warn(`Gemini model (${model}) notice: ${modelErr.message}. Trying next resilient model...`);
    }
  }

  // OpenRouter fallback if configured
  if (OPENROUTER_API_KEY) {
    try {
      const orResult = await callOpenRouter(OPENROUTER_API_KEY, 'google/gemini-flash-1.5', [
        { role: 'system', content: fullSystemPrompt },
        ...messages.map(m => ({
          role: (m.sender === 'user' || m.role === 'user') ? 'user' : 'assistant',
          content: m.text || m.content || ''
        })),
        ...(prompt ? [{ role: 'user', content: prompt }] : [])
      ]);
      return {
        success: true,
        message: orResult,
        modelUsed: 'openrouter/gemini-flash-1.5',
        status: 'online'
      };
    } catch (orErr) {
      console.error("OpenRouter fallback failed:", orErr);
    }
  }

  throw new Error("Unable to reach Gemini API. All model attempts failed.");
}

async function callGeminiAPI(apiKey, model, systemPrompt, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 800
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey.trim()
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}: Gemini request failed`);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Empty candidate response returned by Gemini API.");
  }

  return text.trim();
}

async function callOpenRouter(apiKey, model, messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'HealthSync Blessy AI Medical OS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.6,
      max_tokens: 800
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}: Request failed`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response returned by AI model.");
  }

  return content.trim();
}

export function getAIStatus() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || GEMINI_API_KEY);
  return {
    configured: hasKey,
    provider: 'Google Gemini Generative AI (Live)',
    activeModel: GEMINI_MODELS[0],
    availableModels: GEMINI_MODELS,
    liveStatus: hasKey ? 'connected' : 'unconfigured'
  };
}
