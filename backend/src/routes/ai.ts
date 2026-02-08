import { FastifyInstance } from 'fastify';
import z from 'zod';
import { buildFallbackResponse, getAIService } from '../ai/aiService';
import { AIProvider, PreviewContext } from '../ai/aiProvider';

const recipeDraftSchema = z.object({
    prompt: z.string().min(3)
});

const categorySuggestSchema = z.object({
    productText: z.string().min(2)
});

const previewContextSchema = z.object({
    summary: z.string().min(3),
    details: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    servings: z.number().int().positive().optional(),
    locale: z.string().optional()
});

export async function aiRoutes(app: FastifyInstance) {
    const aiService = getAIService();

    const ensureEnabled = (reply: any): reply is { status: (code: number) => any } => {
        if (!aiService.enabled || !aiService.provider) {
            reply.status(503).send({
                error: 'AI_DISABLED',
                message: 'AI support is disabled on this server.'
            });
            return false;
        }
        return true;
    };

    const handleRequest = async (
        provider: AIProvider,
        reply: any,
        handler: () => Promise<unknown>
    ) => {
        try {
            const result = await handler();
            reply.send(result);
        } catch (error) {
            reply.status(502).send(buildFallbackResponse(provider.name, provider.model, error));
        }
    };

    app.post('/recipe-draft', {
        schema: { body: recipeDraftSchema }
    }, async (req, reply) => {
        if (!ensureEnabled(reply)) return;
        const { prompt } = req.body as { prompt: string };
        const provider = aiService.provider!;

        await handleRequest(provider, reply, () => provider.generateRecipeDraft(prompt));
    });

    app.post('/category-suggest', {
        schema: { body: categorySuggestSchema }
    }, async (req, reply) => {
        if (!ensureEnabled(reply)) return;
        const { productText } = req.body as { productText: string };
        const provider = aiService.provider!;

        await handleRequest(provider, reply, () => provider.suggestCategory(productText));
    });

    app.post('/explain-preview', {
        schema: { body: z.object({ context: previewContextSchema }) }
    }, async (req, reply) => {
        if (!ensureEnabled(reply)) return;
        const { context } = req.body as { context: PreviewContext };
        const provider = aiService.provider!;

        await handleRequest(provider, reply, () => provider.explainPreview(context));
    });
}
