import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Globe, X, Send, AlertTriangle, PhoneCall, Phone, PhoneOff, Radio } from 'lucide-react';
import { voiceStreamClient } from '../../services/voiceStreamClient.js';
import { blessyConversationEngine } from '../../engines/blessyConversationEngine.js';

export default function VoiceOverlayModal({ isOpen, onClose, user = null }) {
  const [status, setStatus] = useState('Listening...'); // 'Listening...' | 'Blessy is speaking...' | 'Processing...'
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [detectedLang, setDetectedLang] = useState('english'); // 'english' | 'hindi'
  const [isContinuousCall, setIsContinuousCall] = useState(true); // Continuous hands-free call mode
  const [isDictating, setIsDictating] = useState(false); // Separate mic-to-text dictation
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [messages, setMessages] = useState([]);

  const activeRef = useRef(isOpen);
  const chatScrollRef = useRef(null);

  // Sync user context and personalized greeting when modal opens or user changes
  useEffect(() => {
    activeRef.current = isOpen;
    if (!isOpen) {
      try {
        voiceStreamClient.stopStream();
      } catch {}
      return;
    }

    // 1. Bind authenticated user context to conversational engine
    if (user) {
      blessyConversationEngine.setUserContext(user);
    }

    // 2. Generate personalized greeting (patient e.g. 'Hello Ayush', doctor e.g. 'Hello Dr. Akhilesh')
    const isHinglish = language === 'hi-IN';
    const greeting = blessyConversationEngine.generateGreeting(isHinglish, user);
    setDetectedLang(isHinglish ? 'hindi' : 'english');

    setMessages([
      {
        id: 'init-' + Date.now(),
        sender: 'blessy',
        text: greeting.message,
        actionChips: greeting.actionChips || [
          { label: '🩺 Show available doctors', action: 'show_doctors' },
          { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
          { label: '📅 Book appointment', action: 'book_appointment' }
        ]
      }
    ]);

    // 3. Try starting voice stream for continuous hands-free call
    try {
      voiceStreamClient.setContinuousCall(true);
      voiceStreamClient.startStream();
      setStatus('Listening...');
    } catch {
      setStatus('Ready');
    }

    const unsubscribeFinal = voiceStreamClient.on('final_transcript', (finalText) => {
      if (!activeRef.current || !finalText) return;
      handleUserSpeech(finalText);
    });

    const unsubscribeInterim = voiceStreamClient.on('interim_transcript', () => {
      if (!activeRef.current) return;
      setStatus('Listening...');
    });

    const unsubscribeSynthesisStart = voiceStreamClient.on('speech_synthesis_start', () => {
      setStatus('Blessy is speaking...');
    });

    const unsubscribeSynthesisEnd = voiceStreamClient.on('speech_synthesis_end', () => {
      if (activeRef.current && isContinuousCall && !isMuted) {
        setStatus('Listening...');
      }
    });

    return () => {
      try {
        voiceStreamClient.stopStream();
      } catch {}
    };
  }, [isOpen, user]);

  // Auto-scroll chat container to the latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleUserSpeech = (actionPayload, displayLabel = null) => {
    if (!actionPayload || !String(actionPayload).trim()) return;
    const textToProcess = String(actionPayload).trim();
    const userBubbleText = displayLabel || textToProcess;

    // 1. Append user message to conversation list
    setMessages(prev => [
      ...prev,
      { id: 'user-' + Date.now(), sender: 'user', text: userBubbleText }
    ]);
    setStatus('Processing...');

    setTimeout(() => {
      try {
        const response = blessyConversationEngine.processMessage(textToProcess);

        // Update active detected language dynamically per-message
        if (response.detectedLanguage) {
          setDetectedLang(response.detectedLanguage);
        }

        // 2. Append Blessy response to conversation list
        setMessages(prev => [
          ...prev,
          {
            id: 'blessy-' + Date.now(),
            sender: 'blessy',
            text: response.message,
            actionChips: response.actionChips || []
          }
        ]);

        if (response.type === 'emergency') {
          setEmergencyAlert(response.data);
        } else {
          setEmergencyAlert(null);
        }

        setStatus('Listening...');

        // 3. Safe speech synthesis in the matching language (non-blocking)
        if (!isMuted) {
          try {
            const speechSummary = (response.message || '')
              .replace(/###/g, '')
              .replace(/\*\*/g, '')
              .replace(/\n/g, ' ')
              .substring(0, 200);

            voiceStreamClient.speak(speechSummary, {
              detectedLanguage: response.detectedLanguage,
              lang: response.detectedLanguage === 'hindi' ? 'hi-IN' : (language === 'en-US' ? 'en-US' : 'en-IN')
            });
          } catch (voiceErr) {
            console.warn("Speech synthesis non-critical fallback:", voiceErr);
          }
        }
      } catch (err) {
        console.error("❌ Blessy Conversation Dispatch Error:", err);
        setStatus('Listening...');
        setMessages(prev => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            sender: 'blessy',
            text: "Main aapki clinical query ko samajhne mein madad kar rahi hoon. Kripya niche diye gaye options mein se chun sakte hain:",
            actionChips: [
              { label: '🩺 Show available doctors', action: 'show_doctors' },
              { label: '💬 Discuss symptoms', action: 'discuss_symptoms' },
              { label: '📅 Book appointment', action: 'book_appointment' }
            ]
          }
        ]);
      }
    }, 250);
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (isDictating) {
      voiceStreamClient.stopDictation();
      setIsDictating(false);
    }
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    handleUserSpeech(text);
  };

  const handleChipClick = (chip) => {
    if (detectedLang === 'hindi') {
      blessyConversationEngine.session.language = 'hinglish';
    } else {
      blessyConversationEngine.session.language = 'english';
    }
    const actionPayload = chip.action || chip.label;
    handleUserSpeech(actionPayload, chip.label);
  };

  // Toggle Continuous Hands-Free Voice Assistant Call
  const handleToggleContinuousCall = () => {
    const next = !isContinuousCall;
    setIsContinuousCall(next);
    voiceStreamClient.setContinuousCall(next);
    if (next) {
      setStatus('Listening...');
    } else {
      setStatus('Voice Call Paused');
    }
  };

  // Separate Mic-to-Text Dictation (Manual per-message dictation)
  const handleToggleDictation = () => {
    if (isDictating) {
      voiceStreamClient.stopDictation();
      setIsDictating(false);
    } else {
      setIsDictating(true);
      const speechLang = language === 'hi-IN' ? 'hi-IN' : (language === 'en-US' ? 'en-US' : 'en-IN');
      voiceStreamClient.startDictation({
        lang: speechLang,
        onInterim: (interim) => {
          setInputText(interim);
        },
        onFinal: (final) => {
          setInputText(prev => {
            const base = prev.trim();
            return base ? `${base} ${final}` : final;
          });
          setIsDictating(false);
        },
        onEnd: () => {
          setIsDictating(false);
        },
        onError: () => {
          setIsDictating(false);
        }
      });
    }
  };

  const handleToggleMic = () => {
    try {
      const muted = voiceStreamClient.toggleMute();
      setIsMuted(muted);
      if (muted) {
        setStatus('Microphone Muted');
      } else {
        setStatus('Listening...');
      }
    } catch {
      setIsMuted(!isMuted);
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    try {
      voiceStreamClient.setLanguage(lang);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/95 backdrop-blur-2xl p-4 transition-all">
      {/* Top Header Controls (Mode, Language Badge, Exit) */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
        {/* Continuous Voice Call Status & Mode Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleContinuousCall}
            title={isContinuousCall ? "Pause Hands-Free Continuous Call" : "Resume Hands-Free Continuous Call"}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              isContinuousCall
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'border-slate-700 bg-brand-surface text-slate-400 hover:text-white'
            }`}
          >
            {isContinuousCall ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span>Live Call: Hands-Free</span>
              </>
            ) : (
              <>
                <PhoneOff className="h-3.5 w-3.5 text-slate-400" />
                <span>Call Paused (Click to resume)</span>
              </>
            )}
          </button>

          {/* Dynamic Language Detection Pill */}
          <div className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-[11px] font-medium text-slate-300">
            {detectedLang === 'hindi' ? (
              <span>🇮🇳 Hindi / Hinglish</span>
            ) : (
              <span>🌐 English</span>
            )}
          </div>
        </div>

        {/* Exit Button */}
        <button
          onClick={onClose}
          title="Exit Blessy Chat"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-slate-400 hover:text-white hover:border-brand-borderActive transition-colors cursor-pointer pointer-events-auto"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Center Stage */}
      <div className="relative flex flex-col items-center justify-center text-center max-w-xl w-full px-2 sm:px-4 space-y-4 max-h-[92vh] pt-12">
        {/* Compact Siri/ChatGPT Organic Orb Header */}
        <div className="relative flex items-center justify-center">
          <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-tr from-brand-tealDark via-brand-teal to-teal-400 shadow-2xl siri-orb-pulse">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-brand-dark to-brand-surfaceElevated flex items-center justify-center border border-white/20">
              <img
                src="assets/blessy_logo.jpg"
                alt="Blessy"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover shadow-inner"
              />
            </div>
          </div>

          {/* Soundwave Frequency Bars when speaking */}
          {status === 'Blessy is speaking...' && (
            <div className="absolute -bottom-4 flex items-center gap-1">
              <span className="w-1 rounded-full bg-brand-tealLight wave-bar-1"></span>
              <span className="w-1 rounded-full bg-brand-tealLight wave-bar-2"></span>
              <span className="w-1 rounded-full bg-brand-tealLight wave-bar-3"></span>
              <span className="w-1 rounded-full bg-brand-tealLight wave-bar-4"></span>
              <span className="w-1 rounded-full bg-brand-tealLight wave-bar-5"></span>
            </div>
          )}
        </div>

        {/* Floating Status Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface/90 px-3.5 py-1 text-[11px] font-medium text-slate-200 shadow-md">
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'Listening...'
                ? 'bg-brand-emerald animate-ping'
                : status === 'Blessy is speaking...'
                ? 'bg-brand-tealLight animate-pulse'
                : status === 'Microphone Muted'
                ? 'bg-rose-400'
                : 'bg-amber-400'
            }`}
          ></span>
          <span>{status}</span>
        </div>

        {/* Emergency Alert Banner if triggered */}
        {emergencyAlert && (
          <div className="w-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-left text-rose-200 space-y-2 animate-bounce max-w-lg">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase">
              <AlertTriangle className="h-4 w-4" /> Acute Clinical Safety Interrupt
            </div>
            <p className="text-xs">{emergencyAlert.safetyMessage}</p>
            <div className="flex gap-2 pt-1">
              <a
                href="tel:911"
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                <PhoneCall className="h-3 w-3" /> Call 108 / 911 Ambulance
              </a>
            </div>
          </div>
        )}

        {/* Live Conversation Transcript (Scrollable Multi-Turn Message Thread) */}
        <div
          ref={chatScrollRef}
          className="w-full max-w-lg h-56 sm:h-64 overflow-y-auto space-y-3 px-3 py-2 text-left rounded-2xl border border-brand-border/40 bg-brand-surface/40 backdrop-blur-sm"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`rounded-2xl p-3 text-xs sm:text-sm leading-relaxed max-w-[88%] shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-brand-teal text-white rounded-br-none'
                    : 'bg-brand-surfaceElevated border border-brand-border text-slate-200 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Action Chips */}
              {msg.sender === 'blessy' && msg.actionChips && msg.actionChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.actionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-teal/40 bg-brand-teal/10 px-2.5 py-1 text-[11px] font-medium text-brand-tealLight hover:bg-brand-teal hover:text-white transition-colors cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {status === 'Processing...' && (
            <div className="flex items-center gap-2 text-xs text-brand-tealLight pl-2 py-1">
              <span className="h-2 w-2 rounded-full bg-brand-teal animate-ping"></span>
              <span>Blessy is thinking...</span>
            </div>
          )}
        </div>

        {/* Always-Visible Chat Input Bar with Separate Mic-to-Text & Send Buttons */}
        <form onSubmit={handleSendText} className="flex w-full items-center gap-2 max-w-lg mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isDictating
                  ? "🎙️ Listening... speak now to dictate"
                  : (detectedLang === 'hindi' ? "Message likhein ya mic dabayein..." : "Type or dictate message...")
              }
              autoFocus
              className={`w-full rounded-xl border bg-brand-surface px-4 py-2.5 pr-11 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none shadow-inner transition-colors ${
                isDictating
                  ? 'border-rose-500 ring-1 ring-rose-500/50'
                  : 'border-brand-border focus:border-brand-teal'
              }`}
            />
            {/* Dedicated Separate Mic-to-Text Dictation Button */}
            <button
              type="button"
              onClick={handleToggleDictation}
              title={isDictating ? "Stop Dictation (Click to review text)" : "Dictate message (Speech to text - review & edit before sending)"}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${
                isDictating
                  ? 'bg-rose-500 text-white animate-pulse shadow-md'
                  : 'text-slate-400 hover:text-brand-tealLight hover:bg-brand-surfaceElevated'
              }`}
            >
              <Mic className={`h-4 w-4 ${isDictating ? 'animate-bounce' : ''}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Send Message"
            className="flex items-center justify-center rounded-xl bg-brand-teal px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-tealDark disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Controls Dock (Mute Mic, Hands-Free Toggle, Language Dropdown) */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-brand-border/40 w-full max-w-lg mx-auto">
          {/* Main Mic Mute Toggle */}
          <button
            onClick={handleToggleMic}
            type="button"
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              isMuted
                ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                : 'border-brand-teal/40 bg-brand-teal/20 text-brand-tealLight hover:bg-brand-teal/30 ring-1 ring-brand-teal/20'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Hands-Free Call Mode Quick Toggle */}
          <button
            onClick={handleToggleContinuousCall}
            type="button"
            title={isContinuousCall ? "Hands-Free Voice Call Active" : "Voice Call Paused"}
            className={`flex h-10 items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isContinuousCall
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                : 'border-brand-border bg-brand-surface text-slate-400 hover:text-white'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${isContinuousCall ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{isContinuousCall ? 'Call Active' : 'Call Paused'}</span>
          </button>

          {/* Language Switcher */}
          <div className="relative">
            <select
              value={language}
              onChange={handleLanguageChange}
              title="Assistant Language"
              className="h-10 rounded-xl border border-brand-border bg-brand-surface px-3 pr-8 text-xs font-medium text-slate-300 appearance-none hover:border-brand-borderActive focus:border-brand-teal focus:outline-none cursor-pointer"
            >
              <option value="en-IN">🌐 Auto (Hindi + English)</option>
              <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
              <option value="en-US">🇺🇸 English</option>
            </select>
            <Globe className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
