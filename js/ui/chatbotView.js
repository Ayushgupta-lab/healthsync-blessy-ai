// AI Chatbot Interface: Floating launcher, conversational drawer, interactive chips & Voice Assistant integration
import { aiChatbotEngine } from '../engines/aiChatbotEngine.js';
import { voiceEngine } from '../engines/voiceEngine.js';
import { notifier } from '../utils/notifications.js';
import { formatTime12 } from '../engines/scheduleEngine.js';

export class ChatbotView {
  constructor() {
    this.launcherEl = null;
    this.drawerEl = null;
    this.isOpen = false;
    this.isTyping = false;
    this.isMicListening = false;
    this.currentAttachment = null;
  }

  init() {
    this.createDom();
    this.bindEvents();
    // Send initial bot greeting
    const greeting = aiChatbotEngine.generateGreeting();
    this.appendBotMessage(greeting, false); // don't auto-speak on initial page load
  }

  createDom() {
    // Launcher
    const launcher = document.createElement('div');
    launcher.className = 'chatbot-launcher';
    launcher.id = 'chatbot-launcher';
    launcher.innerHTML = `
      <div class="launcher-tooltip">✨ Need an appointment? Ask Blessy AI</div>
      <button class="chatbot-launcher-btn" id="chatbot-toggle-btn" aria-label="Open Blessy AI Executive Assistant">
        <div class="launcher-pulse-ring"></div>
        <img src="assets/blessy_logo.jpg" alt="Blessy AI" class="launcher-avatar-img">
      </button>
    `;
    document.body.appendChild(launcher);
    this.launcherEl = launcher;

    // Drawer
    const drawer = document.createElement('div');
    drawer.className = 'chatbot-drawer';
    drawer.id = 'chatbot-drawer';
    drawer.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-profile">
          <img src="assets/blessy_logo.jpg" alt="Blessy AI" class="chat-avatar-img">
          <div class="chat-header-info">
            <h4>Blessy AI</h4>
            <div class="chat-status-text">Medical AI • GPT-4o Mini 🟢 Active</div>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-header-btn voice-launch-btn" id="chat-open-voice-modal-btn" title="Open Full Hands-Free Voice Assistant">
            🎙️ Blessy Live
          </button>
          <button class="chat-header-btn" id="chat-voice-toggle-btn" title="Toggle Voice Responses">
            🔊
          </button>
          <button class="chat-header-btn" id="chat-reset-btn" title="Restart Conversation">🔄</button>
          <button class="chat-header-btn" id="chat-close-btn" title="Minimize Chat">&times;</button>
        </div>
      </div>

      <div class="chat-voice-banner" id="chat-voice-banner">
        <span>✨ <strong>Blessy Live Voice</strong>: Hands-Free Voice PA (Say "Hello Blessy")</span>
        <button class="voice-banner-action-btn" id="banner-launch-voice-btn">Open Blessy Live &rarr;</button>
      </div>

      <div class="chat-messages-body" id="chat-messages-container">
        <!-- Messages stream here -->
      </div>

      <!-- Gemini-Style Image Attachment Preview Bar -->
      <div class="chat-image-preview-bar" id="chat-image-preview-bar" style="display: none;">
        <div class="chat-preview-thumb-wrap">
          <img id="chat-preview-img" src="" alt="Selected Attachment" class="chat-preview-thumb">
          <div class="chat-preview-info">
            <span class="chat-preview-name" id="chat-preview-name">xray.png</span>
            <span class="chat-preview-type" id="chat-preview-type">Digital X-Ray / Report</span>
          </div>
        </div>
        <button class="chat-preview-remove-btn" id="chat-preview-remove-btn" title="Remove attachment">&times;</button>
      </div>

      <!-- Hidden file input -->
      <input type="file" id="chat-image-file-input" accept="image/*,.pdf" style="display: none;">

      <!-- Gemini-Style 3-in-1 Input Dock -->
      <div class="chat-input-dock" id="chat-input-dock">
        <button class="chat-dock-btn chat-upload-btn" id="chat-upload-btn" title="Attach X-Ray, Lab Report, or Symptom Photo">
          📷
        </button>
        <input type="text" class="chat-input" id="chat-user-input" placeholder="Ask Blessy anything, or attach an image / X-ray..." autocomplete="off">
        <button class="chat-dock-btn chat-mic-btn" id="chat-mic-btn" title="Click to Speak (Speech-to-Text)">
          🎙️
        </button>
        <button class="chat-dock-btn chat-live-voice-btn" id="chat-dock-voice-btn" title="Blessy Live (Direct Hands-Free Voice Assistant)">
          ✨
        </button>
        <button class="chat-send-btn" id="chat-send-btn" aria-label="Send Message">
          ➤
        </button>
      </div>
    `;
    document.body.appendChild(drawer);
    this.drawerEl = drawer;
  }

  bindEvents() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const resetBtn = document.getElementById('chat-reset-btn');
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-user-input');
    const micBtn = document.getElementById('chat-mic-btn');
    const voiceToggleBtn = document.getElementById('chat-voice-toggle-btn');
    const openVoiceModalBtn = document.getElementById('chat-open-voice-modal-btn');
    const bannerVoiceBtn = document.getElementById('banner-launch-voice-btn');
    const uploadBtn = document.getElementById('chat-upload-btn');
    const fileInput = document.getElementById('chat-image-file-input');
    const removePreviewBtn = document.getElementById('chat-preview-remove-btn');
    const dockVoiceBtn = document.getElementById('chat-dock-voice-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleChat());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        voiceEngine.stopSpeaking();
        aiChatbotEngine.resetSession();
        this.clearAttachment();
        const container = document.getElementById('chat-messages-container');
        if (container) container.innerHTML = '';
        const greeting = aiChatbotEngine.generateGreeting();
        this.appendBotMessage(greeting, false);
      });
    }

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => this.handleSendMessage());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Voice output toggle in header
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
        const enabled = voiceEngine.toggleVoiceOutput();
        voiceToggleBtn.textContent = enabled ? '🔊' : '🔇';
        voiceToggleBtn.title = enabled ? 'Voice Output ON' : 'Voice Output Muted';
        notifier.showToast(enabled ? 'Voice output enabled' : 'Voice output muted', 'info');
      });
    }

    // Launch Full Voice Assistant Studio
    const launchVoiceAssistant = () => {
      voiceEngine.stopSpeaking();
      this.closeChat();
      window.dispatchEvent(new CustomEvent('voice-assistant:open'));
    };

    if (openVoiceModalBtn) openVoiceModalBtn.addEventListener('click', launchVoiceAssistant);
    if (bannerVoiceBtn) bannerVoiceBtn.addEventListener('click', launchVoiceAssistant);
    if (dockVoiceBtn) dockVoiceBtn.addEventListener('click', launchVoiceAssistant);

    // Image Upload Button & File Input
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) this.handleFileSelect(file);
      });
    }

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', () => this.clearAttachment());
    }

    // Clipboard Paste Support (Images directly pasted into chat input)
    if (input) {
      input.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData).items;
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            this.handleFileSelect(file);
            break;
          }
        }
      });
    }

    // Drag & Drop Support on drawer
    if (this.drawerEl) {
      this.drawerEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.drawerEl.classList.add('drag-active');
      });
      this.drawerEl.addEventListener('dragleave', () => {
        this.drawerEl.classList.remove('drag-active');
      });
      this.drawerEl.addEventListener('drop', (e) => {
        e.preventDefault();
        this.drawerEl.classList.remove('drag-active');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFileSelect(files[0]);
        }
      });
    }

    // Mic Button (Speech-to-Text)
    if (micBtn && input) {
      micBtn.addEventListener('click', () => {
        if (this.isMicListening) {
          voiceEngine.stopListening();
          this.setMicState(false);
        } else {
          this.startVoiceInput();
        }
      });
    }

    // Global event listener to open chat from banner
    window.addEventListener('chatbot:open', () => {
      this.openChat();
    });
  }

  handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentAttachment = {
        name: file.name,
        type: file.type,
        dataUrl: e.target.result
      };
      const previewBar = document.getElementById('chat-image-preview-bar');
      const previewImg = document.getElementById('chat-preview-img');
      const previewName = document.getElementById('chat-preview-name');
      const previewType = document.getElementById('chat-preview-type');
      if (previewBar && previewImg && previewName) {
        previewImg.src = e.target.result;
        previewName.textContent = file.name;
        if (previewType) {
          const lower = file.name.toLowerCase();
          previewType.textContent = (lower.includes('xray') || lower.includes('x-ray'))
            ? 'Digital Bone/Chest X-Ray'
            : (lower.includes('report') || lower.includes('blood') || lower.includes('cbc'))
            ? 'Blood / Lab Pathology Report'
            : 'Clinical Photo Attachment';
        }
        previewBar.style.display = 'flex';
      }
      notifier.showToast(`Attached: ${file.name}`, 'info');
    };
    reader.readAsDataURL(file);
  }

  clearAttachment() {
    this.currentAttachment = null;
    const previewBar = document.getElementById('chat-image-preview-bar');
    const fileInput = document.getElementById('chat-image-file-input');
    if (previewBar) previewBar.style.display = 'none';
    if (fileInput) fileInput.value = '';
  }

  startVoiceInput() {
    const input = document.getElementById('chat-user-input');
    this.setMicState(true);
    if (input) input.placeholder = '🎙️ Listening... Speak now!';

    voiceEngine.startListening({
      onStart: () => {
        this.setMicState(true);
      },
      onInterim: (interim) => {
        if (input) input.value = interim;
      },
      onFinal: (final) => {
        if (input) input.value = final;
        this.setMicState(false);
        if (input) input.placeholder = 'Ask Blessy anything, or attach an image / X-ray...';
        // Auto send final voice input
        setTimeout(() => this.handleSendMessage(), 300);
      },
      onError: (err) => {
        this.setMicState(false);
        if (input) input.placeholder = 'Ask Blessy anything, or attach an image / X-ray...';
        if (err === 'not-allowed' || err === 'NOT_SUPPORTED') {
          notifier.showToast("Microphone access unavailable. Click 'Blessy Live' in header for instant voice prompts!", "warning");
        }
      },
      onEnd: () => {
        this.setMicState(false);
        if (input) input.placeholder = 'Ask Blessy anything, or attach an image / X-ray...';
      }
    });
  }

  setMicState(listening) {
    this.isMicListening = listening;
    const micBtn = document.getElementById('chat-mic-btn');
    if (micBtn) {
      if (listening) {
        micBtn.classList.add('listening');
        micBtn.textContent = '🔴';
        micBtn.title = 'Listening... Click to stop';
      } else {
        micBtn.classList.remove('listening');
        micBtn.textContent = '🎙️';
        micBtn.title = 'Click to Speak (Speech-to-Text)';
      }
    }
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    this.drawerEl.classList.add('open');
    const input = document.getElementById('chat-user-input');
    if (input) setTimeout(() => input.focus(), 150);
  }

  closeChat() {
    this.isOpen = false;
    this.setMicState(false);
    voiceEngine.stopListening();
    voiceEngine.stopSpeaking();
    this.drawerEl.classList.remove('open');
  }

  handleSendMessage() {
    const input = document.getElementById('chat-user-input');
    if (!input) return;
    const text = input.value.trim();
    const attachment = this.currentAttachment;

    if ((!text && !attachment) || this.isTyping) return;

    input.value = '';
    this.clearAttachment();

    this.appendUserMessage(text, attachment);

    // Show typing indicator
    this.showTypingIndicator();

    setTimeout(async () => {
      try {
        const response = await (aiChatbotEngine.processUserMessageAsync ? 
          aiChatbotEngine.processUserMessageAsync(text, attachment) : 
          aiChatbotEngine.processUserMessage(text, attachment));
        this.hideTypingIndicator();
        this.appendBotMessage(response, true);
      } catch (err) {
        this.hideTypingIndicator();
        const fallback = aiChatbotEngine.processUserMessage(text, attachment);
        this.appendBotMessage(fallback, true);
      }
    }, 350);
  }

  appendUserMessage(text, attachment = null) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = 'chat-msg user';

    let attachmentHtml = '';
    if (attachment && attachment.dataUrl) {
      attachmentHtml = `
        <div class="chat-bubble-attachment">
          <img src="${attachment.dataUrl}" alt="${this.escapeHtml(attachment.name)}" class="bubble-attached-img">
          <div class="bubble-attachment-name">📎 ${this.escapeHtml(attachment.name)}</div>
        </div>
      `;
    }

    msg.innerHTML = `
      <div class="chat-bubble">
        ${attachmentHtml}
        ${text ? `<div>${this.escapeHtml(text)}</div>` : ''}
      </div>
    `;
    container.appendChild(msg);
    this.scrollToBottom();
  }

  appendBotMessage(response, shouldSpeak = true) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    notifier.playSound('message');

    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';

    let contentHtml = this.formatMarkdown(response.message);

    // Multi-modal Vision & Report Analysis Card
    if (response.analysisData) {
      const a = response.analysisData;
      contentHtml += `
        <div class="chat-medical-analysis-card">
          <div class="analysis-card-header">
            <span class="analysis-badge">🔬 ${a.badge || 'Vision & Health Analysis'}</span>
            <span class="analysis-tag">Blessy Vision AI</span>
          </div>
          <div class="analysis-finding-box">
            <div class="analysis-box-title">🔎 Visual Observations:</div>
            <div class="analysis-box-desc">${a.finding || ''}</div>
          </div>
          <div class="analysis-impression-box">
            <div class="analysis-box-title">💡 Clinical Impression:</div>
            <div class="analysis-box-desc">${a.impression || ''}</div>
          </div>
          <div class="analysis-action-box">
            <div class="analysis-box-title">🩺 Recommended Next Steps:</div>
            <div class="analysis-box-desc">${a.nextSteps || ''}</div>
          </div>
          <div class="analysis-disclaimer">
            ⚠️ <em>Blessy AI screening analysis. Please consult our clinic specialists for formal diagnosis and prescription.</em>
          </div>
        </div>
      `;
    }

    // Confirmation card if summaryData exists
    if (response.summaryData) {
      const s = response.summaryData;
      contentHtml += `
        <div class="chat-confirmation-card">
          <h4>📋 Appointment Overview</h4>
          <div class="card-spec-row">
            <span>Specialist:</span>
            <span>${s.doctorName}</span>
          </div>
          <div class="card-spec-row">
            <span>Date & Time:</span>
            <span style="color: var(--accent-cyan);">${s.date} at ${s.time}</span>
          </div>
          <div class="card-spec-row">
            <span>Room:</span>
            <span>${s.room}</span>
          </div>
          <div class="card-spec-row">
            <span>Reason:</span>
            <span>${s.symptoms}</span>
          </div>
          <div class="card-spec-row">
            <span>Triage Priority:</span>
            <span class="urgency-indicator ${s.urgency}">${s.urgency}</span>
          </div>
          <div class="card-spec-row">
            <span>Fee:</span>
            <span>${s.fee}</span>
          </div>
        </div>
      `;
    }

    // Break conflict styling card
    if (response.type === 'break_conflict') {
      contentHtml = `<div class="chat-break-card">${contentHtml}</div>`;
    }

    // Emergency warning styling
    if (response.type === 'emergency') {
      contentHtml = `<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: var(--radius-md); padding: 1rem; color: #fecaca;">${contentHtml}</div>`;
    }

    // Action chips
    let chipsHtml = '';
    if (response.actionChips && response.actionChips.length > 0) {
      chipsHtml = `
        <div class="chat-chips-container">
          ${response.actionChips.map(c => `
            <button class="chat-chip" data-action="${c.action}">
              ${c.label}
            </button>
          `).join('')}
        </div>
      `;
    }

    // Read aloud button
    const speechText = response.analysisData
      ? `${response.analysisData.badge}. Visual observation: ${response.analysisData.finding}. Recommended next step: ${response.analysisData.nextSteps}`
      : (response.summaryData 
        ? `Appointment overview: ${response.summaryData.doctorName} on ${response.summaryData.date} at ${response.summaryData.time}. Room ${response.summaryData.room}. Please confirm booking.`
        : response.message);

    msg.innerHTML = `
      <div class="chat-bubble">
        ${contentHtml}
        ${chipsHtml}
        <div class="bubble-voice-action">
          <button class="bubble-listen-btn" title="Listen to spoken response">
            🔊 Read Aloud
          </button>
        </div>
      </div>
    `;

    container.appendChild(msg);

    // Bind Read Aloud button
    const listenBtn = msg.querySelector('.bubble-listen-btn');
    if (listenBtn) {
      listenBtn.addEventListener('click', () => {
        if (voiceEngine.isSpeaking) {
          voiceEngine.stopSpeaking();
          listenBtn.textContent = '🔊 Read Aloud';
        } else {
          listenBtn.textContent = '⏹️ Stop';
          voiceEngine.speak(speechText, {
            onEnd: () => { listenBtn.textContent = '🔊 Read Aloud'; },
            onError: () => { listenBtn.textContent = '🔊 Read Aloud'; }
          });
        }
      });
    }

    // Speak aloud if enabled and requested
    if (shouldSpeak && voiceEngine.voiceOutputEnabled) {
      voiceEngine.speak(speechText);
    }

    // Bind chip click events
    msg.querySelectorAll('.chat-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        if (action.startsWith('tel:')) {
          window.location.href = action;
          return;
        }

        if (action === 'trigger_upload') {
          const fileInput = document.getElementById('chat-image-file-input');
          if (fileInput) fileInput.click();
          return;
        }

        // Show user selection
        this.appendUserMessage(chip.textContent.trim());
        this.showTypingIndicator();

        setTimeout(() => {
          this.hideTypingIndicator();
          const nextResponse = aiChatbotEngine.handleAction(action);
          this.appendBotMessage(nextResponse, true);
        }, 400);
      });
    });

    this.scrollToBottom();
  }

  showTypingIndicator() {
    this.isTyping = true;
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    let indicator = document.getElementById('chat-typing-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'chat-typing-indicator';
      indicator.className = 'chat-msg bot';
      indicator.innerHTML = `
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      container.appendChild(indicator);
    }
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    this.isTyping = false;
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  scrollToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  formatMarkdown(text) {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');

    // Bold & italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Bullets
    html = html.replace(/^[•\-] (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gms, '<ul style="margin: 0.5rem 0; padding-left: 1.2rem;">$1</ul>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}

export const chatbotView = new ChatbotView();
