import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RecipeService } from '../services/recipeService';
import { RecipeSource } from '@prisma/client';
import prisma from '../lib/prisma';

export async function recipeRoutes(app: FastifyInstance) {
    // List recipes
    app.get('/', async (request, reply) => {
        // In a real app, we'd get householdId from auth
        const householdId = (await prisma.household.findFirst())?.id;
        if (!householdId) return reply.status(400).send({ error: 'No household found' });

        const recipes = await prisma.recipe.findMany({
            where: { householdId },
            include: {
                _count: {
                    select: { ingredients: true }
                }
            },
            orderBy: { name: 'asc' }
        });
        return recipes;
    });

    // Create recipe
    app.post('/', {
        schema: {
            body: z.object({
                name: z.string(),
                servings: z.number().int().positive(),
                source: z.nativeEnum(RecipeSource).optional(),
                ingredients: z.array(z.object({
                    productId: z.string(),
                    quantity: z.number().positive(),
                    unitId: z.string()
                }))
            })
        }
    }, async (request, reply) => {
        const householdId = (await prisma.household.findFirst())?.id;
        if (!householdId) return reply.status(400).send({ error: 'No household found' });

        const body = request.body as any;
        const recipe = await RecipeService.createRecipe({
            ...body,
            householdId
        });
        return recipe;
    });

    // Preview consumption
    app.get('/:id/preview', {
        schema: {
            params: z.object({ id: z.string() }),
            querystring: z.object({ servings: z.string().transform(v => parseInt(v)).optional() })
        }
    }, async (request, reply) => {
        const householdId = (await prisma.household.findFirst())?.id;
        const { id } = request.params as any;
        const { servings } = request.query as any;

        const recipe = await prisma.recipe.findUnique({ where: { id } });
        const finalServings = servings || recipe?.servings || 1;

        const preview = await RecipeService.previewConsumption(id, finalServings, householdId!);
        return preview;
    });

    // Cook recipe
    app.post('/:id/cook', {
        schema: {
            params: z.object({ id: z.string() }),
            body: z.object({
                servings: z.number().int().positive().optional()
            })
        }
    }, async (request, reply) => {
        const householdId = (await prisma.household.findFirst())?.id;
        const userId = (await prisma.user.findFirst())?.id; // Mock auth
        const { id } = request.params as any;
        const { servings } = request.body as any;

        const recipe = await prisma.recipe.findUnique({ where: { id } });
        const finalServings = servings || recipe?.servings || 1;

        try {
            const result = await RecipeService.cookRecipe(id, finalServings, householdId!, userId!);
            return result;
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    });
}
