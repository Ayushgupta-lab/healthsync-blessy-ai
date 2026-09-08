// Voice Engine: Web Speech API wrapper for Speech-to-Text (STT) & Text-to-Speech (TTS)
// Features: Gemini Live continuous turn-taking, automatic silence detection (VAD), multi-language (Hinglish/Hindi/English), and wake-word listener

export class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.wakeWordRecognition = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isListening = false;
    this.isSpeaking = false;
    this.isContinuousLive = true; // Gemini Live mode: auto-listen after speaking
    this.voiceOutputEnabled = true;
    this.preferredVoice = null;
    this.currentUtterance = null;
    this.callbacks = {};
    this.silenceTimeout = null;
    this.silenceDelayMs = 1300; // 1.3s silence triggers auto-complete
    this.currentLanguage = 'en-IN'; // 'en-IN' handles Hinglish, Hindi & English

    this.initRecognition();
    this.initVoices();
    this.initWakeWordListener();
  }

  initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition is not natively supported in this browser.");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.callbacks.onStart) this.callbacks.onStart();
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Reset silence timer on every voice activity
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);

        if (interimTranscript && this.callbacks.onInterim) {
          this.callbacks.onInterim(interimTranscript);

          // Automatic VAD: If patient stops talking for 1.3s, auto-finalize speech
          this.silenceTimeout = setTimeout(() => {
            if (this.isListening) {
              const fullSpeech = (finalTranscript || interimTranscript).trim();
              if (fullSpeech.length > 1) {
                this.stopListening();
                if (this.callbacks.onFinal) {
                  this.callbacks.onFinal(fullSpeech);
                }
              }
            }
          }, this.silenceDelayMs);
        }

        if (finalTranscript && this.callbacks.onFinal) {
          if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
          this.callbacks.onFinal(finalTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.warn("SpeechRecognition error:", event.error);
        this.isListening = false;
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        if (this.callbacks.onError) {
          this.callbacks.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
        if (this.callbacks.onEnd) this.callbacks.onEnd();
      };
    } catch (e) {
      console.warn("Could not instantiate SpeechRecognition:", e);
    }
  }

  // Wake-word background listener ("Hello Blessy", "Hey Blessy", "Blessy")
  initWakeWordListener() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      this.wakeWordRecognition = new SpeechRecognition();
      this.wakeWordRecognition.continuous = true;
      this.wakeWordRecognition.interimResults = false;
      this.wakeWordRecognition.lang = 'en-IN';

      this.wakeWordRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const phrase = event.results[i][0].transcript.toLowerCase().trim();
          if (
            phrase.includes('hello blessy') || phrase.includes('hey blessy') || 
            phrase.includes('hi blessy') || phrase.includes('blessy') || 
            phrase.includes('sunno blessy') || phrase.includes('hello aura')
          ) {
            window.dispatchEvent(new CustomEvent('voice-assistant:open', { detail: { prompt: phrase } }));
          }
        }
      };

      this.wakeWordRecognition.onerror = () => {};
    } catch (e) {
      console.warn("Wake word listener not available:", e);
    }
  }

  setLanguage(langCode) {
    // 'en-IN' (Hinglish/English), 'hi-IN' (Hindi), 'en-US' (US English)
    this.currentLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      // Select natural voice (prefer Indian English / Hindi / Natural English)
      let preferred = null;
      if (this.currentLanguage.includes('hi') || this.currentLanguage.includes('IN')) {
        preferred = voices.find(v => v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Hindi'));
      }
      if (!preferred) {
        preferred = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Sonia'))
        );
      }
      this.preferredVoice = preferred || voices.find(v => v.lang.startsWith('en')) || voices[0];
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  isSupported() {
    const hasSTT = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasTTS = typeof window !== 'undefined' && !!window.speechSynthesis;
    return { recognition: hasSTT, synthesis: hasTTS };
  }

  // Start listening with automated silence detection
  startListening({ onStart, onInterim, onFinal, onError, onEnd } = {}) {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    this.callbacks = { onStart, onInterim, onFinal, onError, onEnd };

    if (!this.recognition) {
      if (onError) onError('NOT_SUPPORTED');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      // If already started, restart
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition.start(), 150);
      } catch (e) {
        if (onError) onError(e.message || 'START_ERROR');
      }
      return false;
    }
  }

  stopListening() {
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
    }
    this.isListening = false;
  }

  // Text-to-speech output with completion callback
  speak(text, { onStart, onEnd, onError } = {}) {
    if (!this.synth || !this.voiceOutputEnabled) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText.trim()) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        console.warn("Error cancelling speech:", e);
      }
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  cleanTextForSpeech(raw) {
    if (!raw) return '';
    let text = raw;

    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/#{1,6}\s+/g, '');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');
    text = text.replace(/^[•\-\*]\s+/gm, '');
    text = text.replace(/<[^>]*>/g, '');

    text = text.replace(/\bDr\.\s*/g, 'Doctor ');
    text = text.replace(/\bapt\b/gi, 'appointment');
    text = text.replace(/\bmin\b/gi, 'minutes');
    text = text.replace(/\bhrs\b/gi, 'hours');
    text = text.replace(/\bER\b/g, 'Emergency Room');

    try {
      text = text.replace(/\p{Extended_Pictographic}/gu, '');
    } catch (e) {}
    text = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '');
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  toggleVoiceOutput() {
    this.voiceOutputEnabled = !this.voiceOutputEnabled;
    if (!this.voiceOutputEnabled && this.isSpeaking) {
      this.stopSpeaking();
    }
    return this.voiceOutputEnabled;
  }
}

export const voiceEngine = new VoiceEngine();
