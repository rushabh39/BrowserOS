/**
 * BrowserOS Web - Agent Module
 * Handles AI agent actions and page interactions
 */

class Agent {
    constructor() {
        this.isRunning = false;
        this.actionQueue = [];
    }

    init() {
        // Agent is initialized but actions are limited due to cross-origin
        console.log('BrowserOS Agent initialized');
    }

    /**
     * Parse natural language command into structured actions
     */
    parseCommand(command) {
        const actions = [];
        const lowerCommand = command.toLowerCase();

        // Click detection
        if (lowerCommand.includes('click')) {
            const match = command.match(/click\s+(?:on\s+)?(?:the\s+)?(.+)/i);
            if (match) {
                actions.push({
                    type: 'click',
                    target: match[1].trim()
                });
            }
        }

        // Type/Fill detection
        if (lowerCommand.includes('type') || lowerCommand.includes('fill') || lowerCommand.includes('enter')) {
            const match = command.match(/(?:type|fill|enter)\s+["']?(.+?)["']?\s+(?:in|into)\s+(?:the\s+)?(.+)/i);
            if (match) {
                actions.push({
                    type: 'type',
                    value: match[1].trim(),
                    target: match[2].trim()
                });
            }
        }

        // Scroll detection
        if (lowerCommand.includes('scroll')) {
            const direction = lowerCommand.includes('up') ? 'up' :
                lowerCommand.includes('down') ? 'down' :
                    lowerCommand.includes('top') ? 'top' :
                        lowerCommand.includes('bottom') ? 'bottom' : 'down';
            actions.push({
                type: 'scroll',
                direction: direction
            });
        }

        // Navigate detection
        if (lowerCommand.includes('go to') || lowerCommand.includes('navigate to') || lowerCommand.includes('open')) {
            const match = command.match(/(?:go to|navigate to|open)\s+(.+)/i);
            if (match) {
                actions.push({
                    type: 'navigate',
                    url: match[1].trim()
                });
            }
        }

        // Select detection
        if (lowerCommand.includes('select')) {
            const match = command.match(/select\s+["']?(.+?)["']?\s+(?:from|in)\s+(?:the\s+)?(.+)/i);
            if (match) {
                actions.push({
                    type: 'select',
                    value: match[1].trim(),
                    target: match[2].trim()
                });
            }
        }

        return actions;
    }

    /**
     * Execute a single action
     */
    async executeAction(action) {
        const iframe = document.getElementById('page-frame');

        switch (action.type) {
            case 'scroll':
                return this.executeScroll(action.direction);

            case 'navigate':
                return this.executeNavigate(action.url);

            case 'click':
            case 'type':
            case 'select':
                // These require access to iframe content
                return this.executeIframeAction(iframe, action);

            default:
                console.warn('Unknown action type:', action.type);
                return false;
        }
    }

    /**
     * Execute scroll action
     */
    executeScroll(direction) {
        const iframe = document.getElementById('page-frame');

        try {
            // Try to scroll iframe content
            const iframeWindow = iframe?.contentWindow;
            if (iframeWindow) {
                switch (direction) {
                    case 'up':
                        iframeWindow.scrollBy(0, -300);
                        break;
                    case 'down':
                        iframeWindow.scrollBy(0, 300);
                        break;
                    case 'top':
                        iframeWindow.scrollTo(0, 0);
                        break;
                    case 'bottom':
                        iframeWindow.scrollTo(0, iframeWindow.document.body.scrollHeight);
                        break;
                }
                return true;
            }
        } catch (e) {
            console.warn('Cross-origin scroll not possible');
        }

        return false;
    }

    /**
     * Execute navigation action
     */
    executeNavigate(url) {
        if (window.browserCore) {
            window.browserCore.navigate(url);
            return true;
        }
        return false;
    }

    /**
     * Execute action that requires iframe content access
     */
    executeIframeAction(iframe, action) {
        if (!iframe) return false;

        try {
            const doc = iframe.contentDocument;
            if (!doc) throw new Error('Cannot access iframe document');

            let element = null;

            // Find element by various methods
            if (action.target) {
                const target = action.target.toLowerCase();

                // Try ID
                element = doc.getElementById(target);

                // Try query selector
                if (!element) {
                    try {
                        element = doc.querySelector(target);
                    } catch (e) { }
                }

                // Try by text content
                if (!element) {
                    const allElements = doc.querySelectorAll('a, button, input, [onclick]');
                    element = Array.from(allElements).find(el =>
                        el.textContent?.toLowerCase().includes(target) ||
                        el.value?.toLowerCase().includes(target) ||
                        el.placeholder?.toLowerCase().includes(target)
                    );
                }

                // Try by label
                if (!element) {
                    const labels = doc.querySelectorAll('label');
                    for (const label of labels) {
                        if (label.textContent?.toLowerCase().includes(target)) {
                            element = doc.getElementById(label.htmlFor) ||
                                label.querySelector('input, textarea, select');
                            break;
                        }
                    }
                }
            }

            if (!element && action.type !== 'scroll') {
                console.warn('Element not found:', action.target);
                return false;
            }

            // Execute the action
            switch (action.type) {
                case 'click':
                    element?.click();
                    return true;

                case 'type':
                    if (element) {
                        element.focus();
                        element.value = action.value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    return true;

                case 'select':
                    if (element && element.tagName === 'SELECT') {
                        const option = Array.from(element.options).find(
                            opt => opt.text.toLowerCase().includes(action.value.toLowerCase()) ||
                                opt.value.toLowerCase().includes(action.value.toLowerCase())
                        );
                        if (option) {
                            element.value = option.value;
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    return true;
            }

        } catch (e) {
            console.warn('Cross-origin restriction prevents this action:', e.message);
            return false;
        }

        return false;
    }

    /**
     * Execute a queue of actions
     */
    async executeActions(actions) {
        if (this.isRunning) {
            console.warn('Agent is already running');
            return;
        }

        this.isRunning = true;
        this.updateStatus('running', 'Executing actions...');

        const results = [];

        for (const action of actions) {
            try {
                const result = await this.executeAction(action);
                results.push({ action, success: result });

                // Small delay between actions
                await this.delay(500);
            } catch (error) {
                results.push({ action, success: false, error: error.message });
            }
        }

        this.isRunning = false;
        this.updateStatus('idle', 'Agent Ready');

        return results;
    }

    /**
     * Update agent status in UI
     */
    updateStatus(status, text) {
        const indicator = document.querySelector('.agent-status .status-indicator');
        const statusText = document.querySelector('.agent-status span');

        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get element info for AI context
     */
    getClickableElements() {
        const iframe = document.getElementById('page-frame');
        const elements = [];

        try {
            const doc = iframe?.contentDocument;
            if (doc) {
                const clickable = doc.querySelectorAll('a, button, input, select, textarea, [onclick], [role="button"]');
                clickable.forEach((el, index) => {
                    elements.push({
                        index: index,
                        tag: el.tagName.toLowerCase(),
                        text: el.textContent?.trim().substring(0, 50),
                        type: el.type,
                        id: el.id,
                        class: el.className
                    });
                });
            }
        } catch (e) {
            // Cross-origin
        }

        return elements;
    }
}

// Export for use in other modules
window.Agent = Agent;
