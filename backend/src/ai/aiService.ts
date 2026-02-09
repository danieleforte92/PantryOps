import { AIProvider, AIProviderError } from './aiProvider';
import { createGemma3nProvider } from './gemma3nProvider';
import { createOllamaProvider } from './ollamaProvider';

export type AIService = {
    enabled: boolean;
    provider: AIProvider | null;
};

const DEFAULT_PROVIDER = 'gemma3n:e4b';

export function getAIService(): AIService {
    const enabled = (process.env.AI_ENABLED ?? 'false').toLowerCase() === 'true';

    if (!enabled) {
        return { enabled, provider: null };
    }

    const providerName = process.env.AI_PROVIDER ?? DEFAULT_PROVIDER;

    if (providerName === 'gemma3n:e4b') {
        return { enabled, provider: createGemma3nProvider() };
    }

    return {
        enabled,
        provider: createOllamaProvider({
            name: providerName,
            model: providerName
        })
    };
}

export function buildFallbackResponse(providerName: string, model: string, error: unknown) {
    const warning = error instanceof AIProviderError ? error.code : 'AI_PROVIDER_FAILED';

    return {
        provider: providerName,
        model,
        content: 'AI provider unavailable. Please try again later.',
        warnings: [warning]
    };
}
