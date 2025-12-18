/**
 * BrowserOS Web - LLM Providers
 * Handles communication with various LLM APIs (client-side only)
 */

class LLMProviders {
    constructor() {
        this.providers = {
            gemini: new GeminiProvider(),
            openai: new OpenAIProvider(),
            claude: new ClaudeProvider(),
            ollama: new OllamaProvider()
        };
    }

    getProvider(name) {
        return this.providers[name] || this.providers.gemini;
    }

    async sendMessage(providerName, message, context = '', options = {}) {
        const provider = this.getProvider(providerName);
        return await provider.sendMessage(message, context, options);
    }
}

/**
 * Base Provider Class
 */
class BaseProvider {
    constructor(name) {
        this.name = name;
    }

    getApiKey() {
        return localStorage.getItem(`${this.name}_api_key`) || '';
    }

    getModel() {
        return localStorage.getItem(`${this.name}_model`) || this.defaultModel;
    }

    isConfigured() {
        return !!this.getApiKey();
    }

    buildSystemPrompt(mode, pageContext) {
        const basePrompt = `You are BrowserOS AI Assistant, a helpful AI integrated into a web browser. You help users understand web pages, automate tasks, and answer questions.`;

        const modePrompts = {
            chat: `You are in Chat Mode. Help the user understand the current page, answer questions about its content, summarize information, and assist with research. Be conversational and helpful.`,
            agent: `You are in Agent Mode. Parse the user's request and provide step-by-step instructions to complete the task. When possible, describe the specific actions needed (click, type, scroll, etc.). Format your response as a list of actions.`,
            teach: `You are in Teach Mode. Help the user create reusable workflows. Analyze recorded actions and suggest improvements or automations.`
        };

        let prompt = `${basePrompt}\n\n${modePrompts[mode] || modePrompts.chat}`;

        if (pageContext) {
            prompt += `\n\nCurrent Page Context:\n${pageContext}`;
        }

        return prompt;
    }

    async sendMessage(message, context = '', options = {}) {
        throw new Error('sendMessage must be implemented by subclass');
    }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider extends BaseProvider {
    constructor() {
        super('gemini');
        this.defaultModel = 'gemini-2.0-flash';
        this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
    }

    async sendMessage(message, context = '', options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Gemini API key not configured. Please add your API key in Settings.');
        }

        const model = this.getModel();
        const mode = options.mode || 'chat';
        const systemPrompt = this.buildSystemPrompt(mode, context);

        const url = `${this.apiEndpoint}/${model}:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: `${systemPrompt}\n\nUser: ${message}` }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('No response from Gemini');
            }

            return { text, provider: 'gemini' };
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends BaseProvider {
    constructor() {
        super('openai');
        this.defaultModel = 'gpt-4.1';
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    }

    async sendMessage(message, context = '', options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
        }

        const model = this.getModel();
        const mode = options.mode || 'chat';
        const systemPrompt = this.buildSystemPrompt(mode, context);

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;

            if (!text) {
                throw new Error('No response from OpenAI');
            }

            return { text, provider: 'openai' };
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }
}

/**
 * Anthropic Claude Provider
 */
class ClaudeProvider extends BaseProvider {
    constructor() {
        super('claude');
        this.defaultModel = 'claude-sonnet-4-20250514';
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
    }

    async sendMessage(message, context = '', options = {}) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Claude API key not configured. Please add your API key in Settings.');
        }

        const model = this.getModel();
        const mode = options.mode || 'chat';
        const systemPrompt = this.buildSystemPrompt(mode, context);

        // Note: Claude API has CORS restrictions, so this may not work directly from browser
        // In a real implementation, you'd need a proxy or use Claude's JS SDK
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 2048,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: message }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `Claude API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.content?.[0]?.text;

            if (!text) {
                throw new Error('No response from Claude');
            }

            return { text, provider: 'claude' };
        } catch (error) {
            console.error('Claude API error:', error);
            throw error;
        }
    }
}

/**
 * Ollama Local Provider
 */
class OllamaProvider extends BaseProvider {
    constructor() {
        super('ollama');
        this.defaultModel = 'llama3.2';
    }

    getEndpoint() {
        return localStorage.getItem('ollama_endpoint') || 'http://localhost:11434';
    }

    async sendMessage(message, context = '', options = {}) {
        const endpoint = this.getEndpoint();
        const model = this.getModel();
        const mode = options.mode || 'chat';
        const systemPrompt = this.buildSystemPrompt(mode, context);

        try {
            const response = await fetch(`${endpoint}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.message?.content;

            if (!text) {
                throw new Error('No response from Ollama');
            }

            return { text, provider: 'ollama' };
        } catch (error) {
            console.error('Ollama API error:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Cannot connect to Ollama. Make sure Ollama is running locally on ' + endpoint);
            }
            throw error;
        }
    }
}

// Export for use in other modules
window.LLMProviders = LLMProviders;
