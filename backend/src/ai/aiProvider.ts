export interface AIResponse {
    provider: string;
    model: string;
    content: string;
    warnings?: string[];
    raw?: unknown;
}

export interface PreviewContext {
    summary: string;
    details?: string;
    ingredients?: string[];
    servings?: number;
    locale?: string;
}

export interface AIProvider {
    name: string;
    model: string;
    generateRecipeDraft(prompt: string): Promise<AIResponse>;
    suggestCategory(productText: string): Promise<AIResponse>;
    explainPreview(context: PreviewContext): Promise<AIResponse>;
}

export class AIProviderError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}
