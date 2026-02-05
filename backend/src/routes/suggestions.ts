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

                if (ing.productId && ing.product) {
                    // Legacy: Product based
                    available = ing.product.currentStock?.quantity || 0;

                    // Check for expiring lots
                    if (ing.product.stockLots) {
                        hasExpiringLot = ing.product.stockLots.some(lot =>
                            lot.bestBeforeDate && lot.bestBeforeDate <= inThreeDays
                        );
                    }
                } else if (ing.ingredientCategoryId) {
                    // NEW: Category based - Use Consumption Engine for consistent logic
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
            querystring: z.object({ householdId: z.string().uuid() })
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { householdId } = request.query;

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

        const ingredients = await Promise.all(recipe.ingredients.map(async (ing: any) => {
            const required = ing.quantity;
            let available = 0;
            let name = 'Unknown Item';
            let id = ing.id;
            let suggestedProducts;

            if (ing.productId) {
                // Legacy: Product based
                available = ing.product.currentStock?.quantity || 0;
                name = ing.product.name;
                id = ing.productId;
            } else if (ing.ingredientCategoryId) {
                // NEW: Category based - Use Consumption Engine for consistent logic
                const consumptionPlan = await computeConsumption(
                    ing.ingredientCategoryId,
                    ing.quantity,
                    householdId,
                    'preview'
                );
                
                available = consumptionPlan.totalAvailable;
                name = ing.ingredientCategory.name;
                id = ing.ingredientCategoryId;

                // Convert consumption plan to suggested products format
                suggestedProducts = consumptionPlan.productAllocations.map(alloc => ({
                    productId: alloc.productId,
                    productName: alloc.productName,
                    suggestedQuantity: alloc.quantity,
                    availableQuantity: alloc.quantity, // Already capped by available
                    priority: 1, // Default, could be fetched if needed
                    stockUnitName: ing.unit.abbreviation,
                    productImage: null // Could be fetched if needed
                }));
            }

            const missing = Math.max(0, required - available);

            return {
                productId: id, // Usiamo ID categoria o prodotto come identificatore
                productName: name,
                required,
                available,
                missing,
                unit: ing.unit.abbreviation,
                suggestedProducts
            };
        }));

        return {
            ingredients,
            canCook: ingredients.every((i: any) => i.missing === 0)
        };
    });
}
