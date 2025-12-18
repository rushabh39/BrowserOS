/**
 * BrowserOS Web - Browser Core
 * Handles tabs, navigation, and page loading
 */

class BrowserCore {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.history = {};
        this.tabIdCounter = 0;

        // CORS proxy for cross-origin requests (optional)
        this.corsProxy = ''; // Set to a CORS proxy URL if needed
    }

    init() {
        this.bindEvents();
        this.createNewTab(); // Create initial tab
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('back-btn')?.addEventListener('click', () => this.goBack());
        document.getElementById('forward-btn')?.addEventListener('click', () => this.goForward());
        document.getElementById('reload-btn')?.addEventListener('click', () => this.reload());
        document.getElementById('home-btn')?.addEventListener('click', () => this.goHome());

        // Address bar
        const urlInput = document.getElementById('url-input');
        urlInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigate(urlInput.value);
            }
        });
        document.getElementById('go-btn')?.addEventListener('click', () => {
            this.navigate(urlInput.value);
        });

        // New tab button
        document.getElementById('new-tab-btn')?.addEventListener('click', () => this.createNewTab());

        // Home page search
        const homeSearch = document.getElementById('home-search');
        homeSearch?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.navigate(homeSearch.value);
            }
        });
        document.getElementById('home-search-btn')?.addEventListener('click', () => {
            this.navigate(homeSearch.value);
        });

        // Quick links
        document.querySelectorAll('.quick-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const url = link.dataset.url;
                if (url) this.navigate(url);
            });
        });

        // Open external button (for error state)
        document.getElementById('open-external-btn')?.addEventListener('click', () => {
            const activeTab = this.getActiveTab();
            if (activeTab?.url) {
                window.open(activeTab.url, '_blank');
            }
        });

        // Iframe load events
        const iframe = document.getElementById('page-frame');
        iframe?.addEventListener('load', () => this.onIframeLoad());
        iframe?.addEventListener('error', () => this.onIframeError());
    }

    createNewTab(url = null) {
        const tabId = `tab-${++this.tabIdCounter}`;
        const tab = {
            id: tabId,
            title: 'New Tab',
            url: url,
            favicon: null,
            isHome: !url
        };

        this.tabs.push(tab);
        this.history[tabId] = { stack: [], index: -1 };
        this.renderTabs();
        this.switchToTab(tabId);

        if (url) {
            this.navigate(url);
        }

        return tabId;
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        this.tabs.splice(index, 1);
        delete this.history[tabId];

        if (this.tabs.length === 0) {
            this.createNewTab();
        } else if (this.activeTabId === tabId) {
            const newIndex = Math.min(index, this.tabs.length - 1);
            this.switchToTab(this.tabs[newIndex].id);
        }

        this.renderTabs();
    }

    switchToTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        this.activeTabId = tabId;
        this.renderTabs();
        this.updateAddressBar(tab.url || '');
        this.updateNavigationButtons();

        if (tab.isHome || !tab.url) {
            this.showWelcomePage();
        } else {
            this.loadUrl(tab.url);
        }
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }

    navigate(input) {
        if (!input || !input.trim()) return;

        const url = this.parseUrl(input.trim());
        const activeTab = this.getActiveTab();

        if (activeTab) {
            activeTab.url = url;
            activeTab.isHome = false;
            activeTab.title = 'Loading...';

            // Add to history
            const history = this.history[activeTab.id];
            if (history) {
                // Remove forward history when navigating to new page
                history.stack = history.stack.slice(0, history.index + 1);
                history.stack.push(url);
                history.index = history.stack.length - 1;
            }

            this.renderTabs();
            this.updateAddressBar(url);
            this.loadUrl(url);
            this.updateNavigationButtons();
        }
    }

    parseUrl(input) {
        // Check if it's already a valid URL
        try {
            const url = new URL(input);
            return url.href;
        } catch (e) {
            // Not a valid URL
        }

        // Check if it looks like a domain
        if (input.match(/^[\w-]+(\.[\w-]+)+/)) {
            return `https://${input}`;
        }

        // Treat as search query
        return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }

    loadUrl(url) {
        const welcomePage = document.getElementById('welcome-page');
        const iframeContainer = document.getElementById('iframe-container');
        const loadingOverlay = document.getElementById('loading-overlay');
        const errorOverlay = document.getElementById('error-overlay');
        const iframe = document.getElementById('page-frame');

        if (!iframe || !iframeContainer) return;

        // Hide welcome page, show iframe
        if (welcomePage) welcomePage.style.display = 'none';
        iframeContainer.style.display = 'flex';
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        if (errorOverlay) errorOverlay.style.display = 'none';

        // Apply CORS proxy if configured
        const targetUrl = this.corsProxy ? `${this.corsProxy}${encodeURIComponent(url)}` : url;

        // Set a timeout for loading
        this.loadTimeout = setTimeout(() => {
            this.onIframeError('Page took too long to load');
        }, 15000);

        try {
            iframe.src = targetUrl;
        } catch (error) {
            this.onIframeError(error.message);
        }
    }

    showWelcomePage() {
        const welcomePage = document.getElementById('welcome-page');
        const iframeContainer = document.getElementById('iframe-container');

        if (welcomePage) welcomePage.style.display = 'flex';
        if (iframeContainer) iframeContainer.style.display = 'none';
    }

    onIframeLoad() {
        clearTimeout(this.loadTimeout);

        const loadingOverlay = document.getElementById('loading-overlay');
        const errorOverlay = document.getElementById('error-overlay');
        const iframe = document.getElementById('page-frame');

        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (errorOverlay) errorOverlay.style.display = 'none';

        // Try to get page title (may fail due to cross-origin)
        const activeTab = this.getActiveTab();
        if (activeTab) {
            try {
                const title = iframe?.contentDocument?.title;
                if (title) {
                    activeTab.title = title;
                    this.renderTabs();
                }
            } catch (e) {
                // Cross-origin restriction - use URL as title
                try {
                    const urlObj = new URL(activeTab.url);
                    activeTab.title = urlObj.hostname;
                    this.renderTabs();
                } catch (e2) {
                    activeTab.title = activeTab.url;
                    this.renderTabs();
                }
            }
        }
    }

    onIframeError(message = 'This page cannot be displayed due to security restrictions.') {
        clearTimeout(this.loadTimeout);

        const loadingOverlay = document.getElementById('loading-overlay');
        const errorOverlay = document.getElementById('error-overlay');
        const errorMessage = document.getElementById('error-message');

        if (loadingOverlay) loadingOverlay.style.display = 'none';
        if (errorOverlay) errorOverlay.style.display = 'flex';
        if (errorMessage) errorMessage.textContent = message;

        const activeTab = this.getActiveTab();
        if (activeTab) {
            try {
                const urlObj = new URL(activeTab.url);
                activeTab.title = urlObj.hostname;
            } catch (e) {
                activeTab.title = 'Error';
            }
            this.renderTabs();
        }
    }

    goBack() {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const history = this.history[activeTab.id];
        if (history && history.index > 0) {
            history.index--;
            const url = history.stack[history.index];
            activeTab.url = url;
            this.updateAddressBar(url);
            this.loadUrl(url);
            this.updateNavigationButtons();
            this.renderTabs();
        }
    }

    goForward() {
        const activeTab = this.getActiveTab();
        if (!activeTab) return;

        const history = this.history[activeTab.id];
        if (history && history.index < history.stack.length - 1) {
            history.index++;
            const url = history.stack[history.index];
            activeTab.url = url;
            this.updateAddressBar(url);
            this.loadUrl(url);
            this.updateNavigationButtons();
            this.renderTabs();
        }
    }

    reload() {
        const activeTab = this.getActiveTab();
        if (activeTab?.url) {
            this.loadUrl(activeTab.url);
        }
    }

    goHome() {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            activeTab.url = null;
            activeTab.isHome = true;
            activeTab.title = 'New Tab';
            this.updateAddressBar('');
            this.showWelcomePage();
            this.renderTabs();
        }
    }

    updateAddressBar(url) {
        const urlInput = document.getElementById('url-input');
        if (urlInput) {
            urlInput.value = url || '';
        }
    }

    updateNavigationButtons() {
        const activeTab = this.getActiveTab();
        const history = activeTab ? this.history[activeTab.id] : null;

        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');

        if (backBtn) {
            backBtn.disabled = !history || history.index <= 0;
        }
        if (forwardBtn) {
            forwardBtn.disabled = !history || history.index >= history.stack.length - 1;
        }
    }

    renderTabs() {
        const container = document.getElementById('tabs-container');
        if (!container) return;

        container.innerHTML = '';

        this.tabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.id === this.activeTabId ? 'active' : ''}`;
            tabEl.innerHTML = `
                <span class="tab-title">${this.escapeHtml(tab.title || 'New Tab')}</span>
                <button class="tab-close" title="Close tab">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            // Tab click (switch)
            tabEl.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    this.switchToTab(tab.id);
                }
            });

            // Close button
            tabEl.querySelector('.tab-close')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });

            container.appendChild(tabEl);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get page content for AI context (limited by cross-origin)
    getPageContent() {
        const activeTab = this.getActiveTab();
        if (!activeTab?.url) {
            return { type: 'home', content: 'User is on the BrowserOS home page.' };
        }

        const iframe = document.getElementById('page-frame');
        try {
            // Try to get content (will fail for cross-origin)
            const doc = iframe?.contentDocument;
            if (doc) {
                const title = doc.title || '';
                const text = doc.body?.innerText?.substring(0, 5000) || '';
                return {
                    type: 'page',
                    url: activeTab.url,
                    title: title,
                    content: text
                };
            }
        } catch (e) {
            // Cross-origin - can only provide URL info
        }

        return {
            type: 'page',
            url: activeTab.url,
            title: activeTab.title,
            content: `[Unable to access page content due to browser security. URL: ${activeTab.url}]`
        };
    }
}

// Export for use in other modules
window.BrowserCore = BrowserCore;
