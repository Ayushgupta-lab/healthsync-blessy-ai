// AI Voice Assistant Modal: Gemini Live Style Hands-Free Clinical Experience
// Features: Fluid morphing orb, continuous hands-free turn taking, Hindi/Hinglish/English, Doctor vs Patient mode
import { voiceEngine } from '../engines/voiceEngine.js';
import { aiChatbotEngine } from '../engines/aiChatbotEngine.js';
import { notifier } from '../utils/notifications.js';

export class VoiceAssistantModal {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.statusTextEl = null;
    this.userTranscriptEl = null;
    this.botResponseEl = null;
    this.visualizerEl = null;
    this.micBtnEl = null;
    this.voiceOutputBtnEl = null;
    this.chipsContainerEl = null;
    this.roleIndicatorEl = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.continuousMode = true; // Auto listen after Aura finishes speaking
    this.currentRole = 'patient'; // 'patient' | 'doctor'
  }

  init() {
    this.createDom();
    this.bindEvents();
  }

  createDom() {
    const modal = document.createElement('div');
    modal.className = 'voice-modal-overlay';
    modal.id = 'voice-assistant-modal';
    modal.innerHTML = `
      <div class="gemini-live-card">
        <!-- Top Controls: Role & Language Bar -->
        <div class="gemini-live-top-bar">
          <div class="gemini-brand-badge">
            <img src="assets/blessy_logo.jpg" alt="Blessy" class="voice-brand-avatar-img">
            <div>
              <h3>Blessy Live Voice AI</h3>
              <span class="live-subtitle-badge">Doctor's Executive PA • Hands-Free Voice</span>
            </div>
          </div>

          <div class="gemini-top-actions">
            <!-- Mode Switcher -->
            <div class="role-pill-switcher">
              <button class="role-pill-btn active" id="voice-role-patient-btn">👤 Patient</button>
              <button class="role-pill-btn" id="voice-role-doctor-btn">👨‍⚕️ Doctor</button>
            </div>

            <!-- Language Switcher -->
            <select class="voice-lang-select" id="voice-lang-select" title="Voice Language">
              <option value="en-IN" selected>🌐 Auto (Hinglish/Hindi/Eng)</option>
              <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
              <option value="en-US">🇺🇸 English</option>
            </select>

            <button class="voice-tool-btn" id="voice-sound-toggle-btn" title="Toggle Spoken Audio">
              🔊 Voice: ON
            </button>
            <button class="gemini-close-btn" id="voice-close-modal-btn" title="Exit Voice Mode">&times;</button>
          </div>
        </div>

        <!-- Central Live Organic Morphing Visualizer -->
        <div class="gemini-visualizer-section" id="gemini-visualizer-container">
          <div class="gemini-fluid-container">
            <div class="gemini-fluid-aura"></div>
            <div class="gemini-morphing-orb" id="gemini-morph-orb">
              <img src="assets/blessy_logo.jpg" alt="Blessy Logo" class="orb-blessy-logo">
            </div>
          </div>

          <!-- Dynamic Audio Soundwave Bars -->
          <div class="gemini-soundwave-bars" id="gemini-soundwave-bars">
            <div class="gem-bar bar-1"></div>
            <div class="gem-bar bar-2"></div>
            <div class="gem-bar bar-3"></div>
            <div class="gem-bar bar-4"></div>
            <div class="gem-bar bar-5"></div>
            <div class="gem-bar bar-6"></div>
            <div class="gem-bar bar-7"></div>
          </div>

          <div class="gemini-live-status-pill" id="voice-live-status">
            <div class="status-pulse-dot"></div>
            <span id="voice-status-label">Live Active • Say "Hello Blessy" or speak naturally...</span>
          </div>
        </div>

        <!-- Dialogue Subtitle Cards (Patient & AI) -->
        <div class="gemini-captions-container">
          <div class="gemini-speech-bubble user-caption">
            <div class="caption-tag">👤 You:</div>
            <div class="caption-text" id="voice-user-transcript">
              <em>(Boliye: "Hello Blessy, Dr. Akhilesh kab free hain?", "Kal 10 baje appointment karo", ya "Main doctor hoon")</em>
            </div>
          </div>

          <div class="gemini-speech-bubble bot-caption">
            <div class="caption-tag bot-tag">✨ Blessy AI (Doctor's PA):</div>
            <div class="caption-text" id="voice-bot-response">
              Namaste! Main Blessy hoon, Dr. Akhilesh Sharma ki Executive PA. Boliye, main aapke liye kya kar sakti hoon?
            </div>
          </div>
        </div>

        <!-- Quick Hinglish & English Voice Prompts -->
        <div class="gemini-prompts-tray" id="voice-chips-container">
          <!-- Populated dynamically -->
        </div>

        <!-- Bottom Gemini Live Control Bar -->
        <div class="gemini-bottom-dock">
          <button class="dock-pill-btn" id="voice-switch-chat-btn" title="Switch to Text Chat Window">
            💬 Text Chat
          </button>

          <button class="gemini-live-mic-btn" id="voice-main-mic-btn" title="Tap to Toggle Listening / Interrupt">
            <div class="mic-glow-ring"></div>
            <span class="mic-icon">🎙️</span>
            <span class="mic-text">Live Listening Active</span>
          </button>

          <button class="dock-pill-btn" id="voice-stop-speech-btn" title="Interrupt / Stop Audio">
            ⏹️ Interrupt
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Cache elements
    this.statusTextEl = modal.querySelector('#voice-status-label');
    this.userTranscriptEl = modal.querySelector('#voice-user-transcript');
    this.botResponseEl = modal.querySelector('#voice-bot-response');
    this.visualizerEl = modal.querySelector('#gemini-visualizer-container');
    this.micBtnEl = modal.querySelector('#voice-main-mic-btn');
    this.voiceOutputBtnEl = modal.querySelector('#voice-sound-toggle-btn');
    this.chipsContainerEl = modal.querySelector('#voice-chips-container');
  }

  bindEvents() {
    // Close button
    const closeBtn = document.getElementById('voice-close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Role switcher
    const patientRoleBtn = document.getElementById('voice-role-patient-btn');
    const doctorRoleBtn = document.getElementById('voice-role-doctor-btn');

    if (patientRoleBtn && doctorRoleBtn) {
      patientRoleBtn.addEventListener('click', () => {
        this.setRole('patient');
        patientRoleBtn.classList.add('active');
        doctorRoleBtn.classList.remove('active');
      });

      doctorRoleBtn.addEventListener('click', () => {
        this.setRole('doctor');
        doctorRoleBtn.classList.add('active');
        patientRoleBtn.classList.remove('active');
      });
    }

    // Language select
    const langSelect = document.getElementById('voice-lang-select');
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        voiceEngine.setLanguage(e.target.value);
        notifier.showToast(`Language set to: ${e.target.options[e.target.selectedIndex].text}`, 'info');
      });
    }

    // Toggle Voice Output
    if (this.voiceOutputBtnEl) {
      this.voiceOutputBtnEl.addEventListener('click', () => {
        const enabled = voiceEngine.toggleVoiceOutput();
        this.voiceOutputBtnEl.textContent = enabled ? '🔊 Voice: ON' : '🔇 Voice: OFF';
        this.voiceOutputBtnEl.classList.toggle('muted', !enabled);
      });
    }

    // Central Mic Button (Toggles listening or interrupts)
    if (this.micBtnEl) {
      this.micBtnEl.addEventListener('click', () => {
        if (this.isSpeaking) {
          voiceEngine.stopSpeaking();
          this.startListening();
        } else if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      });
    }

    // Stop Audio Button
    const stopAudioBtn = document.getElementById('voice-stop-speech-btn');
    if (stopAudioBtn) {
      stopAudioBtn.addEventListener('click', () => {
        voiceEngine.stopSpeaking();
        this.setVisualizerState('idle');
        this.setStatus('Audio stopped. Listening for your speech...');
        if (this.continuousMode) {
          setTimeout(() => this.startListening(), 200);
        }
      });
    }

    // Switch to Text Chat View
    const chatBtn = document.getElementById('voice-switch-chat-btn');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        this.close();
        window.dispatchEvent(new CustomEvent('chatbot:open'));
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Global event listener
    window.addEventListener('voice-assistant:open', (e) => {
      const autoPrompt = e.detail?.prompt;
      this.open(autoPrompt);
    });
  }

  setRole(role) {
    this.currentRole = role;
    aiChatbotEngine.setRole(role);
    this.renderRolePromptChips();

    if (role === 'doctor') {
      const doctorGreeting = "Namaste Doctor! Doctor Voice Mode active hai. Aap bol sakte hain: 'Mera weekly schedule banao' ya 'Main 10 tareekh ko 2 se 4 baje tak busy hoon, appointments next day shift kar do'.";
      this.setBotResponse(doctorGreeting);
      this.speakText(doctorGreeting, () => {
        setTimeout(() => this.startListening(), 400);
      });
    } else {
      const patientGreeting = "Patient Mode active hai. Aap pooch sakte hain: 'Dr. Akhilesh kab free hain?' ya 'Kal 2 baje appointment chahiye'.";
      this.setBotResponse(patientGreeting);
      this.speakText(patientGreeting, () => {
        setTimeout(() => this.startListening(), 400);
      });
    }
  }

  renderRolePromptChips() {
    if (!this.chipsContainerEl) return;

    if (this.currentRole === 'doctor') {
      this.chipsContainerEl.innerHTML = `
        <button class="gemini-chip-btn" data-voice-cmd="Mera weekly schedule bana ke do, monthly mat do">
          📅 "Weekly schedule bana ke do"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Main 10 tareekh ko 2 baje se 4 baje tak busy hoon, appointments next day shift kar do">
          🚨 "10 tareekh 2-4 PM busy, shift to next day"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="20 minute ka tea break shuru karo">
          ☕ "20 min tea break shuru karo"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Main clinic me wapas available hoon">
          🟢 "Mark clinic available"
        </button>
      `;
    } else {
      this.chipsContainerEl.innerHTML = `
        <button class="gemini-chip-btn" data-voice-cmd="Dr. Akhilesh kab free hain?">
          🩺 "Dr. Akhilesh kab free hain?"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Can I book an appointment tomorrow at 1:30 PM?">
          🥗 "Kal 1:30 PM appointment (Lunch Break Test)"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Mujhe kal 2 baje appointment chahiye">
          📅 "Kal 2 baje appointment book karo"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Mera sar dard aur bukhar hai 2 din se">
          🤕 "Sar dard aur bukhar hai"
        </button>
        <button class="gemini-chip-btn" data-voice-cmd="Doctor break timings kya hain?">
          🕒 "Doctor break timings kya hain?"
        </button>
      `;
    }

    this.chipsContainerEl.querySelectorAll('.gemini-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.voiceCmd;
        if (cmd) this.simulateVoiceCommand(cmd);
      });
    });
  }

  open(initialPrompt = null) {
    this.isOpen = true;
    this.modalEl.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.renderRolePromptChips();

    if (this.voiceOutputBtnEl) {
      this.voiceOutputBtnEl.textContent = voiceEngine.voiceOutputEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF';
      this.voiceOutputBtnEl.classList.toggle('muted', !voiceEngine.voiceOutputEnabled);
    }

    if (initialPrompt) {
      this.simulateVoiceCommand(initialPrompt);
    } else {
      const greeting = "Namaste! Main Aura hoon, aapki clinical voice assistant. Boliye, Dr. Akhilesh ya kisi specialist se appointment lena hai ya routine schedule check karna hai?";
      this.setBotResponse(greeting);
      this.speakText(greeting, () => {
        // True Gemini Live: Automatically start listening hands-free
        setTimeout(() => this.startListening(), 400);
      });
    }
  }

  close() {
    this.isOpen = false;
    this.stopListening();
    voiceEngine.stopSpeaking();
    this.modalEl.classList.remove('active');
    document.body.style.overflow = '';
  }

  startListening() {
    if (this.isListening || this.isSpeaking) return;

    this.setVisualizerState('listening');
    this.setStatus('Gemini Live Listening... Boliye, main sun rahi hoon');
    this.setUserTranscript('Listening to your voice...');

    const started = voiceEngine.startListening({
      onStart: () => {
        this.isListening = true;
        this.setVisualizerState('listening');
        this.setStatus('Listening... (Aap bolna band karenge toh automatic process hoga)');
        if (this.micBtnEl) {
          this.micBtnEl.classList.add('active-listening');
          this.micBtnEl.querySelector('.mic-text').textContent = 'Listening... Speak now';
        }
      },
      onInterim: (interim) => {
        this.setUserTranscript(`"${interim}..."`);
      },
      onFinal: (final) => {
        this.setUserTranscript(`"${final}"`);
        this.processVoiceInput(final);
      },
      onError: (err) => {
        this.isListening = false;
        this.setVisualizerState('idle');
        if (this.micBtnEl) {
          this.micBtnEl.classList.remove('active-listening');
          this.micBtnEl.querySelector('.mic-text').textContent = 'Tap to Speak';
        }

        if (err === 'not-allowed' || err === 'NOT_SUPPORTED') {
          this.setStatus('Microphone access unavailable. Tap any sample voice prompt below!');
          this.setUserTranscript('Microphone permission required. Tap any prompt chip below for instant voice interaction!');
        } else {
          this.setStatus('Speech paused. Tap to speak or click any prompt.');
        }
      },
      onEnd: () => {
        this.isListening = false;
        if (this.micBtnEl) {
          this.micBtnEl.classList.remove('active-listening');
          this.micBtnEl.querySelector('.mic-text').textContent = 'Live Ready';
        }
      }
    });

    if (!started) {
      this.setStatus('Microphone not detected. You can test instant voice responses using the prompt chips below!');
    }
  }

  stopListening() {
    voiceEngine.stopListening();
    this.isListening = false;
    this.setVisualizerState('idle');
    this.setStatus('Voice input paused. Tap orb or mic to resume.');
    if (this.micBtnEl) {
      this.micBtnEl.classList.remove('active-listening');
      this.micBtnEl.querySelector('.mic-text').textContent = 'Tap to Speak';
    }
  }

  simulateVoiceCommand(commandText) {
    this.stopListening();
    this.setUserTranscript(`"${commandText}"`);
    this.processVoiceInput(commandText);
  }

  processVoiceInput(userSpeech) {
    this.setVisualizerState('thinking');
    this.setStatus('Checking doctor availability, breaks & schedule...');

    setTimeout(() => {
      // Check if user changed role in speech: e.g. "Main doctor hoon"
      if (userSpeech.toLowerCase().includes('main doctor hoon') || userSpeech.toLowerCase().includes('i am doctor')) {
        this.currentRole = 'doctor';
        document.getElementById('voice-role-doctor-btn')?.classList.add('active');
        document.getElementById('voice-role-patient-btn')?.classList.remove('active');
      }

      const response = aiChatbotEngine.processUserMessage(userSpeech);
      this.handleVoiceResponse(response);
    }, 400);
  }

  handleVoiceResponse(response) {
    let displayText = response.message;
    let spokenText = response.message;

    if (response.summaryData) {
      const s = response.summaryData;
      spokenText = `Appointment overview: ${s.doctorName} on ${s.date} at ${s.time} in room ${s.room}. Consultation fee is ${s.fee}. Please confirm your booking.`;
    }

    if (response.type === 'break_conflict') {
      this.setStatus('⚠️ Doctor Routine Break Detected - Explaining Meal/Rest Interval');
    } else if (response.type === 'emergency') {
      this.setStatus('🚨 Critical Emergency Warning!');
    } else if (response.type === 'doctor_action') {
      this.setStatus('👨‍⚕️ Doctor Routine & Appointments Updated!');
    } else {
      this.setStatus('Aura is speaking...');
    }

    this.setBotResponse(displayText);
    this.renderDynamicChips(response.actionChips);

    // Speak response aloud, then immediately continue hands-free listening (Gemini Live loop!)
    this.speakText(spokenText, () => {
      this.setVisualizerState('idle');
      this.setStatus('Aura finished speaking. Speak again to continue conversation...');

      // Auto continue listening (Gemini Live hands-free flow)
      if (this.continuousMode && this.isOpen) {
        setTimeout(() => {
          if (!this.isSpeaking && this.isOpen) {
            this.startListening();
          }
        }, 500);
      }
    });
  }

  speakText(text, onFinished) {
    this.setVisualizerState('speaking');
    voiceEngine.speak(text, {
      onStart: () => {
        this.isSpeaking = true;
        this.setVisualizerState('speaking');
      },
      onEnd: () => {
        this.isSpeaking = false;
        if (onFinished) onFinished();
      },
      onError: () => {
        this.isSpeaking = false;
        this.setVisualizerState('idle');
        if (onFinished) onFinished();
      }
    });
  }

  renderDynamicChips(chips) {
    if (!this.chipsContainerEl) return;
    if (!chips || chips.length === 0) {
      this.renderRolePromptChips();
      return;
    }

    this.chipsContainerEl.innerHTML = chips.map(c => `
      <button class="gemini-chip-btn" data-action="${c.action}" data-voice-cmd="${c.label}">
        ${c.label}
      </button>
    `).join('');

    this.chipsContainerEl.querySelectorAll('.gemini-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action) {
          const userLabel = btn.textContent.trim();
          this.setUserTranscript(`"${userLabel}"`);
          this.setVisualizerState('thinking');
          this.setStatus('Processing selection...');

          setTimeout(() => {
            const nextResp = aiChatbotEngine.handleAction(action);
            this.handleVoiceResponse(nextResp);
          }, 350);
        } else {
          const cmd = btn.dataset.voiceCmd;
          if (cmd) this.simulateVoiceCommand(cmd);
        }
      });
    });
  }

  setVisualizerState(state) {
    if (!this.visualizerEl) return;
    this.visualizerEl.className = `gemini-visualizer-section state-${state}`;
  }

  setStatus(text) {
    if (this.statusTextEl) {
      this.statusTextEl.textContent = text;
    }
  }

  setUserTranscript(text) {
    if (this.userTranscriptEl) {
      this.userTranscriptEl.textContent = text;
    }
  }

  setBotResponse(rawText) {
    if (!this.botResponseEl) return;
    let html = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h4 style="color: #38bdf8; margin: 0.35rem 0; font-size: 1rem;">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^[•\-] (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gms, '<ul style="margin: 0.35rem 0; padding-left: 1.2rem;">$1</ul>')
      .replace(/\n\n/g, '<br>')
      .replace(/\n/g, '<br>');

    this.botResponseEl.innerHTML = html;
  }
}

export const voiceAssistantModal = new VoiceAssistantModal();
