import { AIProvider } from './aiProvider';
import { createOllamaProvider } from './ollamaProvider';

const GEMMA3N_MODEL = 'gemma3n:e4b';

export function createGemma3nProvider(): AIProvider {
    return createOllamaProvider({
        name: 'gemma3n:e4b',
        model: process.env.OLLAMA_MODEL ?? GEMMA3N_MODEL
    });
}
