import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import prisma from '../lib/prisma';
import { 
  computeConsumption, 
  hasExpiringProductsInCategory 
} from '../services/consumptionEngine';

export async function suggestionRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();
    
    fastify.get('/today', async (request, reply) => {
        const householdId = (await prisma.household.findFirst())?.id;
        if (!householdId) return reply.status(400).send({ error: 'No household found' });

        // 1. Get all recipes for context
        const recipes = await prisma.recipe.findMany({
            where: { householdId },
            include: {
                ingredients: {
                    include: {
                        product: {
                            include: {
                                currentStock: true,
                                stockLots: {
                                    where: {
                                        balance: { remainingQuantity: { gt: 0 } }
                                    },
                                    orderBy: { bestBeforeDate: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        const today = new Date();
        const inThreeDays = new Date();
        inThreeDays.setDate(today.getDate() + 3);

        const scoredRecipes = await Promise.all(recipes.map(async (recipe) => {
            let totalIngredients = recipe.ingredients.length;
            let availableIngredients = 0;
            let usesExpiringItems = false;

            for (const ing of recipe.ingredients) {
                let available = 0;
                let hasExpiringLot = false;

                if (ing.ingredientCategoryId) {
                    // Category based - Use Consumption Engine for consistent logic
                    const consumptionPlan = await computeConsumption(
                        ing.ingredientCategoryId,
                        ing.quantity,
                        householdId,
                        'preview'
                    );
                    available = consumptionPlan.totalAvailable;

                    // Check if any product in category has expiring lots
                    hasExpiringLot = await hasExpiringProductsInCategory(
                        ing.ingredientCategoryId,
                        householdId,
                        inThreeDays
                    );
                }

                if (available >= ing.quantity) {
                    availableIngredients++;
                }

                if (hasExpiringLot) {
                    usesExpiringItems = true;
                }
            }

            const matchPercentage = totalIngredients > 0 ? (availableIngredients / totalIngredients) * 100 : 0;
            const missingIngredientsCount = totalIngredients - availableIngredients;

            return {
                id: recipe.id,
                title: recipe.name,
                matchPercentage: Math.round(matchPercentage),
                missingIngredientsCount,
                usesExpiringItems,
                // Simple score: match percentage + bonus for expiring items
                score: matchPercentage + (usesExpiringItems ? 50 : 0)
            };
        }));

        // 2. Sort by score
        return scoredRecipes
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Limit to 5 for "Oggi" UX
            .map(({ score, ...rest }) => rest);
    });

    // RECIPE PREVIEW (Decision Support)
    fastify.get('/recipes/:id/preview', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            querystring: z.object({
                householdId: z.string().uuid(),
                servings: z.coerce.number().positive().optional()
            })
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { householdId, servings } = request.query;

        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: {
                        unit: true,
                        product: {
                            include: {
                                stockUnit: true,
                                currentStock: true
                            }
                        },
                        ingredientCategory: true
                    }
                }
            }
        });

        if (!recipe) return reply.status(404).send({ error: 'Recipe not found' });

        const legacyIngredients = recipe.ingredients.filter((ing: any) => !ing.ingredientCategoryId);
        if (legacyIngredients.length > 0) {
            return reply.status(400).send({
                error: 'LEGACY_RECIPE_INGREDIENT',
                message: 'Ricetta legacy: esegui la migrazione per usare ingredientCategoryId',
                count: legacyIngredients.length
            });
        }

        const baseServings = (recipe as any).servings || 1;
        const factor = servings ? (servings / baseServings) : 1;
        const now = new Date();

        const ingredients = await Promise.all(recipe.ingredients.map(async (ing: any) => {
            const required = ing.quantity * factor;

            // Category based - Use Consumption Engine for consistent logic
            const consumptionPlan = await computeConsumption(
                ing.ingredientCategoryId,
                required,
                householdId,
                'preview'
            );

            // Convert consumption plan to suggested products format
            const suggestedProducts = consumptionPlan.productAllocations.map(alloc => {
                const bestBeforeDate = alloc.lots
                    .map(lot => lot.bestBeforeDate)
                    .filter((date): date is Date => Boolean(date))
                    .sort((a, b) => a.getTime() - b.getTime())[0] || null;

                const daysToExpiry = bestBeforeDate
                    ? Math.ceil((bestBeforeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                return {
                productId: alloc.productId,
                productName: alloc.productName,
                suggestedQuantity: alloc.quantity,
                stockUnitName: ing.unit.abbreviation,
                bestBeforeDate: bestBeforeDate ? bestBeforeDate.toISOString() : null,
                daysToExpiry,
                reason: 'FEFO: scadenza più vicina'
                };
            });

            const available = consumptionPlan.totalAvailable;
            const missing = Math.max(0, required - available);
            const status = missing === 0 ? 'covered' : available > 0 ? 'partial' : 'missing';

            return {
                ingredientCategoryId: ing.ingredientCategoryId,
                ingredientName: ing.ingredientCategory.name,
                required,
                available,
                missing,
                unit: ing.unit.abbreviation,
                status,
                suggestedProducts
            };
        }));

        const canCook = ingredients.every((i: any) => i.status === 'covered');
        const coverageStatus = canCook
            ? 'covered'
            : ingredients.every((i: any) => i.status === 'missing')
                ? 'missing'
                : 'partial';

        return {
            ingredients,
            canCook,
            coverageStatus,
            explanation: 'Usiamo prima i prodotti con scadenza più vicina.'
        };
    });
}
