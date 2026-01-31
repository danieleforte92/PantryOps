import { FastifyInstance } from 'fastify';
import z from 'zod';
import prisma from '../lib/prisma';
import { resolveCategoryStock } from '../services/categoryService';

/**
 * Checks if any product in category has expiring lots
 * Used for expiring bonus in recipe suggestions
 * 
 * @param categoryId - Category to check
 * @param householdId - Household context
 * @param beforeDate - Date threshold for expiring
 * @returns true if any product has lots expiring before threshold
 */
async function hasExpiringProductsInCategory(
  categoryId: string,
  householdId: string,
  beforeDate: Date
): Promise<boolean> {
  const productsInCategory = await prisma.productIngredientCategory.findMany({
    where: { ingredientCategoryId: categoryId },
    include: {
      product: {
        include: {
          stockLots: {
            where: {
              balance: {
                remainingQuantity: {
                  gt: 0,
                },
              },
            },
            orderBy: {
              bestBeforeDate: 'asc',
            },
          },
        },
      },
    },
    take: 1, // We only need to know IF any exists, not all
  });

  if (productsInCategory.length === 0) return false;

  const product = productsInCategory[0].product;
  if (!product.stockLots || product.stockLots.length === 0) return false;

  // Check if first (earliest expiring) lot is before threshold
  const earliestExpiringLot = product.stockLots[0];
  return (
    earliestExpiringLot.bestBeforeDate !== null &&
    earliestExpiringLot.bestBeforeDate <= beforeDate
  );
}

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

        const scoredRecipes = await Promise.all(recipes.map(async (recipe) => {
            let totalIngredients = recipe.ingredients.length;
            let availableIngredients = 0;
            let usesExpiringItems = false;

            for (const ing of recipe.ingredients) {
                let available = 0;
                let hasExpiringLot = false;

                if (ing.productId) {
                    // Legacy: Product based
                    available = ing.product.currentStock?.quantity || 0;

                    // Check for expiring lots
                    if (ing.product.stockLots) {
                        hasExpiringLot = ing.product.stockLots.some(lot =>
                            lot.bestBeforeDate && lot.bestBeforeDate <= inThreeDays
                        );
                    }
                } else if (ing.ingredientCategoryId) {
                    // NEW: Category based - Resolve category stock
                    const resolution = await resolveCategoryStock(
                        ing.ingredientCategoryId,
                        householdId
                    );
                    available = resolution.totalAvailable;

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

            if (ing.productId) {
                // Legacy: Product based
                available = ing.product.currentStock?.quantity || 0;
                name = ing.product.name;
                id = ing.productId;
            } else if (ing.ingredientCategoryId) {
                // NEW: Category based - Resolve category stock with suggested products
                const resolution = await resolveCategoryStock(
                    ing.ingredientCategoryId,
                    householdId
                );
                available = resolution.totalAvailable;
                name = ing.ingredientCategory.name;
                id = ing.ingredientCategoryId;

                // Calculate suggested quantities (distribute required across products by priority)
                const totalRequired = ing.quantity;
                let remainingRequired = totalRequired;
                const suggestedProductsWithQuantities = resolution.suggestedProducts.map((sp: any) => ({
                    ...sp,
                    suggestedQuantity: 0
                }));

                // Distribute required quantity across products by priority
                for (let i = 0; i < suggestedProductsWithQuantities.length && remainingRequired > 0; i++) {
                    const consume = Math.min(suggestedProductsWithQuantities[i].availableQuantity, remainingRequired);
                    suggestedProductsWithQuantities[i].suggestedQuantity = consume;
                    remainingRequired -= consume;
                }

                // Attach suggested products to ingredient
                ingredient.suggestedProducts = suggestedProductsWithQuantities;
            }

            const missing = Math.max(0, required - available);

            return {
                productId: id, // Usiamo ID categoria o prodotto come identificatore
                productName: name,
                required,
                available,
                missing,
                unit: ing.unit.abbreviation,
                suggestedProducts: ingredient.suggestedProducts || undefined
            };
        }));

        return {
            ingredients,
            canCook: ingredients.every((i: any) => i.missing === 0)
        };
    });
}
