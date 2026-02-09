import { AIProvider, AIProviderError, AIResponse, PreviewContext } from './aiProvider';

type OllamaGenerateResponse = {
    response: string;
    model: string;
};

type OllamaProviderOptions = {
    name?: string;
    model: string;
    baseUrl?: string;
    timeoutMs?: number;
};

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT_MS = 30000;

async function callOllama(prompt: string, options: OllamaProviderOptions): Promise<AIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: options.model,
                prompt,
                stream: false
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new AIProviderError('OLLAMA_REQUEST_FAILED', `Ollama request failed with status ${response.status}`);
        }

        const data = (await response.json()) as OllamaGenerateResponse;

        return {
            provider: options.name ?? 'ollama',
            model: data.model ?? options.model,
            content: data.response?.trim() ?? '',
            raw: data
        };
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            throw new AIProviderError('OLLAMA_TIMEOUT', 'Ollama request timed out');
        }
        if (error instanceof AIProviderError) {
            throw error;
        }
        throw new AIProviderError('OLLAMA_UNKNOWN_ERROR', error?.message ?? 'Unknown Ollama error');
    } finally {
        clearTimeout(timeout);
    }
}

export function createOllamaProvider(options: OllamaProviderOptions): AIProvider {
    const baseOptions = {
        name: options.name ?? 'ollama',
        model: options.model,
        baseUrl: options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL,
        timeoutMs: options.timeoutMs ?? Number(process.env.OLLAMA_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS
    };

    return {
        name: baseOptions.name,
        model: baseOptions.model,
        async generateRecipeDraft(prompt: string): Promise<AIResponse> {
            const fullPrompt = `You are PantryOps AI. Draft a universal recipe with ingredient categories and amounts.
Requirements:
- Use ingredient categories, not specific products.
- Keep it concise and grounded in the user prompt.
- Return plain text.

User request:
${prompt}`;
            return callOllama(fullPrompt, baseOptions);
        },
        async suggestCategory(productText: string): Promise<AIResponse> {
            const fullPrompt = `You are PantryOps AI. Suggest a single ingredient category.
Requirements:
- Respond with a single category name.
- Grounded only on the input.

Product description:
${productText}`;
            return callOllama(fullPrompt, baseOptions);
        },
        async explainPreview(context: PreviewContext): Promise<AIResponse> {
            const fullPrompt = `You are PantryOps AI. Explain the preview in human-friendly terms.
Requirements:
- Grounded only on the provided context.
- Keep it concise.
- Do not invent data.

Preview context (JSON):
${JSON.stringify(context, null, 2)}`;
            return callOllama(fullPrompt, baseOptions);
        }
    };
}
