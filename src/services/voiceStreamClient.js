// Voice Stream Client: Production-grade WebRTC / WebSocket real-time audio client with fallback
import { clinicalTools } from './clinicalTools.js';

export class VoiceStreamClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'ws://localhost:8080/voice-stream';
    this.ws = null;
    this.pc = null; // WebRTC PeerConnection
    this.state = 'IDLE'; // IDLE | CONNECTING | STREAMING | DISCONNECTED
    this.isMuted = false;
    this.language = options.language || 'en-IN'; // 'hi-IN' | 'en-IN' | 'en-US'
    this.listeners = new Map();
    this.audioContext = null;
    this.mediaStream = null;
    this.useBrowserFallback = true; // Fallback to Web Speech API in demo environments
    this.recognition = null;
    this.dictationRecognition = null;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.isSpeaking = false;
    this.isContinuousCall = true; // Continuous hands-free voice assistant loop
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  setState(newState) {
    this.state = newState;
    this.emit('state_change', newState);
  }

  async startStream() {
    this.setState('CONNECTING');

    // Check if WebSocket server is available, otherwise initialize Web Speech fallback
    try {
      if (!this.useBrowserFallback && typeof WebSocket !== 'undefined') {
        this.ws = new WebSocket(this.serverUrl);
        this.ws.binaryType = 'arraybuffer';
        this.setupWebSocket();
        return;
      }
    } catch {
      console.warn("WebSocket stream server offline. Switching to browser Web Speech & Web Audio stream engine.");
    }

    this.setupBrowserStreamEngine();
  }

  setupWebSocket() {
    this.ws.onopen = () => {
      this.setState('STREAMING');
      this.emit('connected', { mode: 'websocket_webrtc' });
      this.startMicrophoneCapture();
    };

    this.ws.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        const payload = JSON.parse(event.data);
        if (payload.type === 'tool_call') {
          this.handleRemoteToolCall(payload);
        } else if (payload.type === 'transcript') {
          this.emit('transcript', payload);
        }
      } else {
        // Binary PCM audio packet chunk
        this.emit('audio_delta', event.data);
      }
    };

    this.ws.onerror = () => {
      console.warn("WebSocket streaming error. Activating browser audio engine.");
      this.setupBrowserStreamEngine();
    };

    this.ws.onclose = () => {
      this.setState('DISCONNECTED');
    };
  }

  setupBrowserStreamEngine() {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      this.emit('error', 'Browser does not support SpeechRecognition. Text input is enabled.');
      this.setState('DISCONNECTED');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.setState('STREAMING');
      this.emit('speech_started');
    };

    this.recognition.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        this.emit('interim_transcript', interim);
      }
      if (final) {
        this.emit('final_transcript', final.trim());
      }
    };

    this.recognition.onerror = (err) => {
      this.emit('stream_error', err.error);
    };

    this.recognition.onend = () => {
      if (this.state === 'STREAMING' && !this.isSpeaking && this.isContinuousCall && !this.isMuted) {
        try { this.recognition.start(); } catch {}
      }
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error("Failed starting speech stream:", e);
    }
  }

  async startMicrophoneCapture() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(this.audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (this.isMuted || this.state !== 'STREAMING') return;
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32 to 16-bit PCM ArrayBuffer
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(pcm16.buffer);
          }
          this.emit('local_audio_chunk', pcm16);
        };
      }
    } catch (err) {
      console.warn("Microphone capture disabled or blocked:", err);
    }
  }

  handleRemoteToolCall(payload) {
    const { toolName, parameters, callId } = payload;
    if (clinicalTools[toolName]) {
      const result = clinicalTools[toolName](parameters);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'tool_output', callId, result }));
      }
      this.emit('tool_executed', { toolName, parameters, result });
    }
  }

  speak(text, options = {}) {
    if (!this.synth) return;
    this.synth.cancel();

    // 1. Temporarily pause continuous speech recognition so TTS doesn't loop back
    if (this.recognition && this.state === 'STREAMING') {
      try { this.recognition.abort(); } catch {}
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice locale based on detected language
    const targetLang = options.lang || (options.detectedLanguage === 'hindi' ? 'hi-IN' : this.language) || 'en-IN';
    utterance.lang = targetLang;
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    try {
      const voices = this.synth.getVoices ? this.synth.getVoices() : [];
      if (voices && voices.length > 0) {
        if (targetLang.startsWith('hi')) {
          const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
          if (hiVoice) utterance.voice = hiVoice;
        } else {
          const enVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en'));
          if (enVoice) utterance.voice = enVoice;
        }
      }
    } catch {}

    this.isSpeaking = true;
    this.emit('speech_synthesis_start', text);

    const finishSpeaking = () => {
      this.isSpeaking = false;
      this.emit('speech_synthesis_end');
      if (options.onEnd) options.onEnd();

      // Automatically resume listening in continuous call mode!
      if (this.isContinuousCall && this.state === 'STREAMING' && !this.isMuted) {
        try {
          if (this.recognition) this.recognition.start();
        } catch {}
      }
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = finishSpeaking;

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.emit('speech_synthesis_end');
    }
  }

  setContinuousCall(enabled) {
    this.isContinuousCall = !!enabled;
    this.emit('continuous_call_changed', this.isContinuousCall);
    if (this.isContinuousCall && this.state === 'STREAMING' && !this.isSpeaking && !this.isMuted) {
      try { if (this.recognition) this.recognition.start(); } catch {}
    } else if (!this.isContinuousCall && this.recognition) {
      try { this.recognition.abort(); } catch {}
    }
    return this.isContinuousCall;
  }

  startDictation({ lang = null, onInterim = null, onFinal = null, onEnd = null, onError = null } = {}) {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition not supported in this browser.');
      return;
    }

    // Temporarily pause continuous background stream while manual dictation is in progress
    if (this.recognition && this.state === 'STREAMING') {
      try { this.recognition.abort(); } catch {}
    }

    this.stopDictation();

    const dictation = new SpeechRecognition();
    dictation.continuous = true;
    dictation.interimResults = true;
    dictation.lang = lang || this.language || 'en-IN';

    dictation.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim && onInterim) onInterim(interim);
      if (final && onFinal) onFinal(final.trim());
    };

    dictation.onerror = (err) => {
      if (onError) onError(err.error);
    };

    dictation.onend = () => {
      if (onEnd) onEnd();
    };

    try {
      dictation.start();
      this.dictationRecognition = dictation;
    } catch (e) {
      if (onError) onError(e);
    }
  }

  stopDictation() {
    if (this.dictationRecognition) {
      try { this.dictationRecognition.stop(); } catch {}
      this.dictationRecognition = null;
    }
    // Resume continuous call if active
    if (this.isContinuousCall && this.state === 'STREAMING' && !this.isSpeaking && !this.isMuted) {
      try { if (this.recognition) this.recognition.start(); } catch {}
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.emit('mute_changed', this.isMuted);
    return this.isMuted;
  }

  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
    this.emit('language_changed', lang);
  }

  stopStream() {
    this.setState('DISCONNECTED');
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
    this.stopDictation();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    this.stopSpeaking();
  }
}

export const voiceStreamClient = new VoiceStreamClient();
