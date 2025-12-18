/**
 * BrowserOS Web - Side Panel
 * Handles AI modes (Chat, Agent, Teach) and UI interactions
 */

class SidePanel {
    constructor() {
        this.isOpen = false;
        this.currentMode = 'chat';
        this.panel = null;
    }

    init() {
        this.panel = document.getElementById('side-panel');
        this.bindEvents();
    }

    bindEvents() {
        // Toggle panel
        document.getElementById('ai-toggle-btn')?.addEventListener('click', () => this.toggle());
        document.getElementById('close-panel-btn')?.addEventListener('click', () => this.close());

        // Mode switching
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });

        // Chat input auto-resize
        const chatInput = document.getElementById('chat-input');
        chatInput?.addEventListener('input', () => this.autoResizeInput(chatInput));

        // Send on Enter (Shift+Enter for newline)
        chatInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        document.getElementById('send-btn')?.addEventListener('click', () => this.sendMessage());

        // Model selector
        document.getElementById('model-select')?.addEventListener('change', (e) => {
            localStorage.setItem('default_provider', e.target.value);
        });

        // Record button (Teach mode)
        document.getElementById('record-btn')?.addEventListener('click', () => this.toggleRecording());

        // Load default provider
        const defaultProvider = localStorage.getItem('default_provider') || 'gemini';
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) modelSelect.value = defaultProvider;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.panel) {
            this.panel.classList.add('open');
            this.isOpen = true;
            document.getElementById('chat-input')?.focus();
        }
    }

    close() {
        if (this.panel) {
            this.panel.classList.remove('open');
            this.isOpen = false;
        }
    }

    switchMode(mode) {
        if (!['chat', 'agent', 'teach'].includes(mode)) return;

        this.currentMode = mode;

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update content visibility
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeContent = document.getElementById(`${mode}-content`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Update input placeholder
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            const placeholders = {
                chat: 'Ask me anything...',
                agent: 'Tell me what to do...',
                teach: 'Describe the workflow...'
            };
            chatInput.placeholder = placeholders[mode];
        }
    }

    autoResizeInput(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput?.value?.trim();

        if (!message) return;

        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Get current container based on mode
        const containerIds = {
            chat: 'chat-messages',
            agent: 'agent-messages',
            teach: 'teach-messages'
        };
        const container = document.getElementById(containerIds[this.currentMode]);

        if (!container) return;

        // Add user message
        this.addMessage(container, message, 'user');

        // Get page context
        const pageContext = window.browserCore?.getPageContent();
        const contextStr = pageContext ?
            `URL: ${pageContext.url || 'Home'}\nTitle: ${pageContext.title || 'BrowserOS'}\nContent: ${pageContext.content}` : '';

        // Show typing indicator
        const typingId = this.showTypingIndicator(container);

        try {
            // Get selected provider
            const provider = document.getElementById('model-select')?.value || 'gemini';

            // Check if provider is configured
            if (!window.settingsManager?.isProviderConfigured(provider)) {
                throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} is not configured. Please add your API key in Settings.`);
            }

            // Send to LLM
            const response = await window.llmProviders.sendMessage(
                provider,
                message,
                contextStr,
                { mode: this.currentMode }
            );

            // Remove typing indicator
            this.removeTypingIndicator(typingId);

            // Add AI response
            this.addMessage(container, response.text, 'ai');

            // Agent mode: parse and potentially execute actions
            if (this.currentMode === 'agent') {
                this.parseAgentActions(response.text);
            }

        } catch (error) {
            // Remove typing indicator
            this.removeTypingIndicator(typingId);

            // Show error
            this.addMessage(container, `Error: ${error.message}`, 'error');
        }
    }

    addMessage(container, text, type) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}-message`;

        if (type === 'user') {
            messageEl.innerHTML = `
                <div class="message-bubble user">${this.escapeHtml(text)}</div>
            `;
        } else if (type === 'ai') {
            messageEl.innerHTML = `
                <div class="ai-avatar">🤖</div>
                <div class="message-bubble ai">${this.formatAIResponse(text)}</div>
            `;
        } else if (type === 'error') {
            messageEl.innerHTML = `
                <div class="ai-avatar" style="background: #ef4444;">⚠️</div>
                <div class="message-bubble ai" style="border-color: #ef4444;">${this.escapeHtml(text)}</div>
            `;
        }

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    showTypingIndicator(container) {
        const id = 'typing-' + Date.now();
        const typingEl = document.createElement('div');
        typingEl.id = id;
        typingEl.className = 'message ai-message typing-indicator';
        typingEl.innerHTML = `
            <div class="ai-avatar">🤖</div>
            <div class="message-bubble ai">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        // Add typing animation styles
        const style = document.createElement('style');
        style.id = 'typing-styles';
        if (!document.getElementById('typing-styles')) {
            style.textContent = `
                .typing-dots {
                    display: flex;
                    gap: 4px;
                    padding: 8px 0;
                }
                .typing-dots span {
                    width: 8px;
                    height: 8px;
                    background: var(--text-secondary);
                    border-radius: 50%;
                    animation: typingBounce 1.4s ease-in-out infinite;
                }
                .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
                .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-8px); }
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(typingEl);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    removeTypingIndicator(id) {
        document.getElementById(id)?.remove();
    }

    formatAIResponse(text) {
        // Basic markdown-like formatting
        let formatted = this.escapeHtml(text);

        // Bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code
        formatted = formatted.replace(/`(.*?)`/g, '<code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 4px;">$1</code>');

        // Lists
        formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
        formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');

        // Wrap consecutive li elements in ul
        formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin: 8px 0; padding-left: 20px;">$&</ul>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseAgentActions(response) {
        // Update agent status
        const statusEl = document.querySelector('.agent-status .status-indicator');
        const statusText = document.querySelector('.agent-status span');

        if (statusEl && statusText) {
            // Check if response contains action keywords
            const hasActions = /click|type|scroll|fill|select|navigate/i.test(response);

            if (hasActions) {
                statusEl.className = 'status-indicator running';
                statusText.textContent = 'Actions Identified';

                // Show notification
                this.showAgentNotification('Actions identified. Due to browser security, some actions may require manual execution.');

                setTimeout(() => {
                    statusEl.className = 'status-indicator idle';
                    statusText.textContent = 'Agent Ready';
                }, 3000);
            }
        }
    }

    showAgentNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'agent-notification';
        notification.style.cssText = `
            background: var(--warning);
            color: black;
            padding: 8px 12px;
            margin: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
        `;
        notification.textContent = message;

        const container = document.getElementById('agent-messages');
        container?.appendChild(notification);
        container.scrollTop = container.scrollHeight;

        setTimeout(() => notification.remove(), 5000);
    }

    // Teach mode recording
    isRecording = false;
    recordedActions = [];

    toggleRecording() {
        const recordBtn = document.getElementById('record-btn');

        if (this.isRecording) {
            this.stopRecording();
            if (recordBtn) {
                recordBtn.classList.remove('recording');
                recordBtn.innerHTML = '<span class="record-dot"></span>Start Recording';
            }
        } else {
            this.startRecording();
            if (recordBtn) {
                recordBtn.classList.add('recording');
                recordBtn.innerHTML = '<span class="record-dot"></span>Stop Recording';
            }
        }

        this.isRecording = !this.isRecording;
    }

    startRecording() {
        this.recordedActions = [];

        // Add event listeners to capture actions
        document.addEventListener('click', this.recordClick.bind(this), true);
        document.addEventListener('input', this.recordInput.bind(this), true);

        // Show recording notification
        const container = document.getElementById('teach-messages');
        const notification = document.createElement('div');
        notification.id = 'recording-notification';
        notification.className = 'message';
        notification.innerHTML = `
            <div class="ai-avatar" style="background: #ef4444;">🔴</div>
            <div class="message-bubble ai">
                <p><strong>Recording started!</strong></p>
                <p>Perform the actions you want to record. Click "Stop Recording" when done.</p>
            </div>
        `;
        container?.appendChild(notification);
    }

    stopRecording() {
        // Remove event listeners
        document.removeEventListener('click', this.recordClick.bind(this), true);
        document.removeEventListener('input', this.recordInput.bind(this), true);

        // Remove notification
        document.getElementById('recording-notification')?.remove();

        // Save workflow if we have actions
        if (this.recordedActions.length > 0) {
            this.saveWorkflow();
        }
    }

    recordClick(e) {
        // Only record clicks in iframe area
        if (e.target.closest('#page-frame')) {
            this.recordedActions.push({
                type: 'click',
                target: this.getElementSelector(e.target),
                timestamp: Date.now()
            });
        }
    }

    recordInput(e) {
        if (e.target.closest('#page-frame')) {
            this.recordedActions.push({
                type: 'input',
                target: this.getElementSelector(e.target),
                value: e.target.value,
                timestamp: Date.now()
            });
        }
    }

    getElementSelector(element) {
        // Generate a CSS selector for the element
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ').join('.')}`;
        return element.tagName.toLowerCase();
    }

    saveWorkflow() {
        const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const workflow = {
            id: Date.now(),
            name: `Workflow ${workflows.length + 1}`,
            actions: this.recordedActions,
            createdAt: new Date().toISOString()
        };

        workflows.push(workflow);
        localStorage.setItem('workflows', JSON.stringify(workflows));

        this.renderWorkflows();

        // Show save notification
        const container = document.getElementById('teach-messages');
        const notification = document.createElement('div');
        notification.className = 'message';
        notification.innerHTML = `
            <div class="ai-avatar" style="background: #10b981;">✓</div>
            <div class="message-bubble ai">
                <p><strong>Workflow saved!</strong></p>
                <p>Recorded ${this.recordedActions.length} actions.</p>
            </div>
        `;
        container?.appendChild(notification);
    }

    renderWorkflows() {
        const container = document.getElementById('saved-workflows');
        if (!container) return;

        const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');

        if (workflows.length === 0) {
            container.innerHTML = `
                <h4>Saved Workflows</h4>
                <p class="no-workflows">No saved workflows yet</p>
            `;
            return;
        }

        container.innerHTML = `
            <h4>Saved Workflows</h4>
            ${workflows.map(w => `
                <div class="workflow-item" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: var(--bg-tertiary);
                    border-radius: 8px;
                    margin-bottom: 8px;
                ">
                    <span>${w.name}</span>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.sidePanel.playWorkflow(${w.id})" style="
                            padding: 4px 12px;
                            background: var(--accent-gradient);
                            color: white;
                            border-radius: 4px;
                            font-size: 12px;
                        ">Play</button>
                        <button onclick="window.sidePanel.deleteWorkflow(${w.id})" style="
                            padding: 4px 8px;
                            background: var(--bg-hover);
                            color: var(--error);
                            border-radius: 4px;
                            font-size: 12px;
                        ">×</button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    playWorkflow(id) {
        const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        const workflow = workflows.find(w => w.id === id);

        if (!workflow) return;

        // Show notification - actual replay is limited due to cross-origin
        const container = document.getElementById('teach-messages');
        const notification = document.createElement('div');
        notification.className = 'message';
        notification.innerHTML = `
            <div class="ai-avatar">▶️</div>
            <div class="message-bubble ai">
                <p><strong>Playing: ${workflow.name}</strong></p>
                <p>This workflow has ${workflow.actions.length} actions.</p>
                <p style="color: var(--warning); margin-top: 8px;">Note: Due to browser security restrictions, automatic replay may be limited for cross-origin pages.</p>
            </div>
        `;
        container?.appendChild(notification);
    }

    deleteWorkflow(id) {
        let workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
        workflows = workflows.filter(w => w.id !== id);
        localStorage.setItem('workflows', JSON.stringify(workflows));
        this.renderWorkflows();
    }
}

// Export for use in other modules
window.SidePanel = SidePanel;
