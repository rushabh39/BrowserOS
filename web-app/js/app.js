/**
 * BrowserOS Web - Main Application
 * Initializes all modules and ties them together
 */

(function () {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 BrowserOS Web - Initializing...');

        // Initialize LLM Providers
        window.llmProviders = new LLMProviders();
        console.log('✓ LLM Providers initialized');

        // Initialize Settings Manager
        window.settingsManager = new SettingsManager();
        window.settingsManager.init();
        console.log('✓ Settings Manager initialized');

        // Initialize Browser Core
        window.browserCore = new BrowserCore();
        window.browserCore.init();
        console.log('✓ Browser Core initialized');

        // Initialize Side Panel
        window.sidePanel = new SidePanel();
        window.sidePanel.init();
        window.sidePanel.renderWorkflows();
        console.log('✓ Side Panel initialized');

        // Initialize Agent
        window.agent = new Agent();
        window.agent.init();
        console.log('✓ Agent initialized');

        // Apply saved settings
        applySettings();

        console.log('🚀 BrowserOS Web ready!');

        // Show welcome message in console
        console.log('%c BrowserOS ', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 24px; padding: 10px 20px; border-radius: 8px; font-weight: bold;');
        console.log('%cAI-Powered Browser - Your words become actions', 'color: #667eea; font-size: 14px;');
        console.log('%cConfigure your AI provider in Settings to get started.', 'color: #888; font-size: 12px;');
    });

    /**
     * Apply saved settings on load
     */
    function applySettings() {
        // Dark mode (default is dark)
        const darkMode = localStorage.getItem('dark_mode') !== 'false';
        if (!darkMode) {
            document.body.classList.add('light-mode');
        }

        // Default provider
        const defaultProvider = localStorage.getItem('default_provider') || 'gemini';
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.value = defaultProvider;
        }

        // Check if any provider is configured
        checkProviderConfiguration();
    }

    /**
     * Check if at least one LLM provider is configured
     */
    function checkProviderConfiguration() {
        const providers = ['gemini', 'openai', 'claude'];
        const hasKey = providers.some(p => localStorage.getItem(`${p}_api_key`));

        if (!hasKey) {
            // Show a subtle hint to configure
            setTimeout(() => {
                showConfigurationHint();
            }, 2000);
        }
    }

    /**
     * Show a subtle hint to configure LLM providers
     */
    function showConfigurationHint() {
        // Only show if on welcome page and panel is closed
        const welcomePage = document.getElementById('welcome-page');
        const sidePanel = document.getElementById('side-panel');

        if (welcomePage?.style.display !== 'none' && !sidePanel?.classList.contains('open')) {
            const hint = document.createElement('div');
            hint.id = 'config-hint';
            hint.innerHTML = `
                <div style="
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--accent-primary);
                    border-radius: 12px;
                    padding: 16px 20px;
                    max-width: 320px;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
                    z-index: 1000;
                    animation: slideUp 0.3s ease;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <span style="font-size: 20px;">💡</span>
                        <button onclick="document.getElementById('config-hint').remove()" style="
                            color: var(--text-muted);
                            font-size: 18px;
                            padding: 0;
                            line-height: 1;
                        ">&times;</button>
                    </div>
                    <p style="font-size: 14px; margin-bottom: 12px;">
                        <strong>Tip:</strong> Add your API key in Settings to unlock AI features!
                    </p>
                    <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
                        Get a free Gemini API key from Google AI Studio.
                    </p>
                    <button onclick="window.settingsManager.open(); document.getElementById('config-hint').remove();" style="
                        width: 100%;
                        padding: 10px;
                        background: var(--accent-gradient);
                        color: white;
                        border-radius: 8px;
                        font-size: 13px;
                        font-weight: 500;
                    ">Open Settings</button>
                </div>
            `;
            document.body.appendChild(hint);

            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                hint.remove();
            }, 10000);
        }
    }

    /**
     * Global error handler
     */
    window.addEventListener('error', (event) => {
        console.error('BrowserOS Error:', event.error);
    });

    /**
     * Handle unhandled promise rejections
     */
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
    });

    /**
     * Keyboard shortcuts
     */
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + L: Focus address bar
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            document.getElementById('url-input')?.focus();
            document.getElementById('url-input')?.select();
        }

        // Ctrl/Cmd + T: New tab
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            window.browserCore?.createNewTab();
        }

        // Ctrl/Cmd + W: Close tab
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            const activeTab = window.browserCore?.getActiveTab();
            if (activeTab) {
                window.browserCore.closeTab(activeTab.id);
            }
        }

        // Ctrl/Cmd + Shift + A: Toggle AI panel
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
            e.preventDefault();
            window.sidePanel?.toggle();
        }

        // F5 or Ctrl/Cmd + R: Reload
        if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
            e.preventDefault();
            window.browserCore?.reload();
        }

        // Alt + Left: Go back
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            window.browserCore?.goBack();
        }

        // Alt + Right: Go forward
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            window.browserCore?.goForward();
        }
    });

})();
