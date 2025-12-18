/**
 * BrowserOS Web - Settings Manager
 * Handles settings persistence and UI
 */

class SettingsManager {
    constructor() {
        this.modal = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.modal = document.getElementById('settings-modal');
        this.bindEvents();
        this.loadSettings();
        this.initialized = true;
    }

    bindEvents() {
        // Open settings
        document.getElementById('settings-btn')?.addEventListener('click', () => this.open());

        // Close settings
        document.getElementById('settings-close-btn')?.addEventListener('click', () => this.close());

        // Close on overlay click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Settings tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Save settings
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.save());

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.style.display !== 'none') {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.loadSettings();
        }
    }

    close() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const activePanel = document.getElementById(`${tabName}-settings`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
    }

    loadSettings() {
        // Gemini
        const geminiKey = document.getElementById('gemini-key');
        const geminiModel = document.getElementById('gemini-model');
        if (geminiKey) geminiKey.value = localStorage.getItem('gemini_api_key') || '';
        if (geminiModel) geminiModel.value = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

        // OpenAI
        const openaiKey = document.getElementById('openai-key');
        const openaiModel = document.getElementById('openai-model');
        if (openaiKey) openaiKey.value = localStorage.getItem('openai_api_key') || '';
        if (openaiModel) openaiModel.value = localStorage.getItem('openai_model') || 'gpt-4.1';

        // Claude
        const claudeKey = document.getElementById('claude-key');
        const claudeModel = document.getElementById('claude-model');
        if (claudeKey) claudeKey.value = localStorage.getItem('claude_api_key') || '';
        if (claudeModel) claudeModel.value = localStorage.getItem('claude_model') || 'claude-sonnet-4-20250514';

        // Ollama
        const ollamaEndpoint = document.getElementById('ollama-endpoint');
        const ollamaModel = document.getElementById('ollama-model');
        if (ollamaEndpoint) ollamaEndpoint.value = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434';
        if (ollamaModel) ollamaModel.value = localStorage.getItem('ollama_model') || 'llama3.2';

        // General settings
        const darkMode = document.getElementById('dark-mode');
        const autoSummarize = document.getElementById('auto-summarize');
        const defaultProvider = document.getElementById('default-provider');

        if (darkMode) darkMode.checked = localStorage.getItem('dark_mode') !== 'false';
        if (autoSummarize) autoSummarize.checked = localStorage.getItem('auto_summarize') === 'true';
        if (defaultProvider) defaultProvider.value = localStorage.getItem('default_provider') || 'gemini';
    }

    save() {
        // Gemini
        const geminiKey = document.getElementById('gemini-key')?.value || '';
        const geminiModel = document.getElementById('gemini-model')?.value || '';
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('gemini_model', geminiModel);

        // OpenAI
        const openaiKey = document.getElementById('openai-key')?.value || '';
        const openaiModel = document.getElementById('openai-model')?.value || '';
        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('openai_model', openaiModel);

        // Claude
        const claudeKey = document.getElementById('claude-key')?.value || '';
        const claudeModel = document.getElementById('claude-model')?.value || '';
        localStorage.setItem('claude_api_key', claudeKey);
        localStorage.setItem('claude_model', claudeModel);

        // Ollama
        const ollamaEndpoint = document.getElementById('ollama-endpoint')?.value || '';
        const ollamaModel = document.getElementById('ollama-model')?.value || '';
        localStorage.setItem('ollama_endpoint', ollamaEndpoint);
        localStorage.setItem('ollama_model', ollamaModel);

        // General settings
        const darkMode = document.getElementById('dark-mode')?.checked ?? true;
        const autoSummarize = document.getElementById('auto-summarize')?.checked ?? false;
        const defaultProvider = document.getElementById('default-provider')?.value || 'gemini';

        localStorage.setItem('dark_mode', darkMode);
        localStorage.setItem('auto_summarize', autoSummarize);
        localStorage.setItem('default_provider', defaultProvider);

        // Update model selector
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.value = defaultProvider;
        }

        this.showSaveConfirmation();
        this.close();
    }

    showSaveConfirmation() {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            Settings saved successfully
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            z-index: 2000;
            animation: slideUp 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    getDefaultProvider() {
        return localStorage.getItem('default_provider') || 'gemini';
    }

    isProviderConfigured(providerName) {
        if (providerName === 'ollama') {
            return true; // Ollama doesn't need API key
        }
        return !!localStorage.getItem(`${providerName}_api_key`);
    }
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(10px); }
    }
`;
document.head.appendChild(style);

// Export for use in other modules
window.SettingsManager = SettingsManager;
