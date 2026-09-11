// Blessy AI Service: Production-Grade LLM Adapter via OpenRouter (Gemini 3.8 Flash & GPT-4o Mini)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODEL = 'google/gemini-3.8-flash';

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
   - If the user writes in Hindi or Hinglish (e.g., "mujhe bukhar hai", "sar dard ho raha hai", "kya karu"), reply in warm, natural, and fluent Hinglish / Hindi.
   - If the user writes in English, reply in polished, professional English.

4. Formatting:
   - Use bold highlights, short bullet points, and clean structure.
   - Keep answers concise, actionable, and easy to read on mobile and desktop.
`;

export async function askBlessyAI({ prompt, messages = [], language = 'auto', context = {} }) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouter / Gemini API Key is missing in environment variables.");
  }

  // Build conversation history
  const conversationMessages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  if (context.patientName) {
    conversationMessages.push({
      role: 'system',
      content: `Active Patient Context: Name: ${context.patientName}, Known Conditions: ${context.conditions?.join(', ') || 'None reported'}.`
    });
  }

  if (messages && messages.length > 0) {
    messages.slice(-6).forEach(m => {
      conversationMessages.push({
        role: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
        content: m.text || m.content || ''
      });
    });
  }

  if (prompt) {
    conversationMessages.push({
      role: 'user',
      content: prompt
    });
  }

  // Attempt 1: Try Primary Model (Google Gemini 3.8 Flash)
  try {
    const result = await callOpenRouter(apiKey, DEFAULT_MODEL, conversationMessages);
    return {
      success: true,
      message: result,
      modelUsed: DEFAULT_MODEL,
      status: 'online'
    };
  } catch (primaryErr) {
    console.warn(`Primary model (${DEFAULT_MODEL}) failed: ${primaryErr.message}. Attempting fallback (${FALLBACK_MODEL})...`);
    
    // Attempt 2: Fallback Model (OpenAI GPT-4o Mini)
    try {
      const fallbackResult = await callOpenRouter(apiKey, FALLBACK_MODEL, conversationMessages);
      return {
        success: true,
        message: fallbackResult,
        modelUsed: FALLBACK_MODEL,
        status: 'online'
      };
    } catch (fallbackErr) {
      console.error("All AI model attempts failed:", fallbackErr);
      throw new Error(`AI Gateway Error: ${fallbackErr.message}`);
    }
  }
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
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || OPENROUTER_API_KEY);
  return {
    configured: hasKey,
    provider: 'OpenRouter (Google Gemini 3.8 & OpenAI)',
    activeModel: DEFAULT_MODEL,
    fallbackModel: FALLBACK_MODEL,
    liveStatus: hasKey ? 'connected' : 'unconfigured'
  };
}
