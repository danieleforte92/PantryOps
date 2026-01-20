import { FastifyInstance } from 'fastify';
import z from 'zod';
import prisma from '../lib/prisma';

export async function suggestionRoutes(app: FastifyInstance) {
    app.get('/today', async (request, reply) => {
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

        const scoredRecipes = recipes.map(recipe => {
            let totalIngredients = recipe.ingredients.length;
            let availableIngredients = 0;
            let usesExpiringItems = false;

            recipe.ingredients.forEach(ing => {
                const available = ing.product.currentStock?.quantity || 0;
                if (available >= ing.quantity) {
                    availableIngredients++;
                }

                // Check for expiring lots of this product
                const hasExpiringLot = ing.product.stockLots.some(lot =>
                    lot.bestBeforeDate && lot.bestBeforeDate <= inThreeDays
                );
                if (hasExpiringLot) usesExpiringItems = true;
            });

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
        });

        // 2. Sort by score
        return scoredRecipes
            .sort((a, b) => b.score - a.score)
            .slice(0, 5) // Limit to 5 for "Oggi" UX
            .map(({ score, ...rest }) => rest);
    });

    // RECIPE PREVIEW (Decision Support)
    app.get('/recipes/:id/preview', {
        schema: {
            params: z.object({ id: z.string().uuid() })
        }
    }, async (request, reply) => {
        const { id } = (request.params as any).id; // Fix access if needed or use type provider

        const recipe = await prisma.recipe.findUnique({
            where: { id: (request.params as any).id },
            include: {
                ingredients: {
                    include: {
                        unit: true,
                        product: {
                            include: {
                                stockUnit: true,
                                currentStock: true
                            }
                        }
                    }
                }
            }
        });

        if (!recipe) return reply.status(404).send({ error: 'Recipe not found' });

        const ingredients = recipe.ingredients.map((ing: any) => {
            const required = ing.quantity;
            const available = ing.product.currentStock?.quantity || 0;
            const missing = Math.max(0, required - available);

            return {
                productId: ing.productId,
                productName: ing.product.name,
                required,
                available,
                missing,
                unit: ing.unit.abbreviation
            };
        });

        return {
            ingredients,
            canCook: ingredients.every((i: any) => i.missing === 0)
        };
    });
}
