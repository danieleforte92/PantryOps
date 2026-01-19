import { PrismaClient, StockTransactionType, RecipeSource } from '@prisma/client';
import prisma from '../lib/prisma';

export interface ConsumptionPreviewItem {
    productId: string;
    productName: string;
    required: number;
    available: number;
    missing: number;
    unit: string;
}

export interface ConsumptionPreview {
    ingredients: ConsumptionPreviewItem[];
    canCook: boolean;
}

export class RecipeService {
    /**
     * Calculates the required ingredients for a recipe and matches them against current stock.
     */
    static async previewConsumption(recipeId: string, servings: number, householdId: string): Promise<ConsumptionPreview> {
        const recipe = await prisma.recipe.findFirst({
            where: { id: recipeId, householdId },
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

        if (!recipe) {
            throw new Error('Recipe not found');
        }

        const servingsFactor = servings / recipe.servings;
        const ingredients: ConsumptionPreviewItem[] = recipe.ingredients.map(ing => {
            const required = ing.quantity * servingsFactor;
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

        const canCook = ingredients.every(i => i.missing === 0);

        return {
            ingredients,
            canCook
        };
    }

    /**
     * Executes the 'Cook' action: consumes stock for all recipe ingredients.
     */
    static async cookRecipe(recipeId: string, servings: number, householdId: string, userId: string) {
        const preview = await this.previewConsumption(recipeId, servings, householdId);

        if (!preview.canCook) {
            throw new Error('Insufficient stock to cook this recipe');
        }

        return await prisma.$transaction(async (tx) => {
            for (const item of preview.ingredients) {
                // Find lots using FEFO (First Expiring First Out)
                const lots = await tx.stockLotBalance.findMany({
                    where: {
                        householdId,
                        productId: item.productId,
                        remainingQuantity: { gt: 0 }
                    },
                    orderBy: [
                        { bestBeforeDate: 'asc' },
                        { purchasedAt: 'asc' }
                    ]
                });

                let remainingToConsume = item.required;

                for (const lot of lots) {
                    if (remainingToConsume <= 0) break;

                    const consumeAmount = Math.min(lot.remainingQuantity, remainingToConsume);

                    await tx.stockTransaction.create({
                        data: {
                            householdId,
                            productId: item.productId,
                            stockLotId: lot.stockLotId,
                            type: StockTransactionType.CONSUME,
                            amount: -consumeAmount,
                            userId
                        }
                    });

                    remainingToConsume -= consumeAmount;
                }

                if (remainingToConsume > 0) {
                    // This shouldn't happen because of canCook check, but better be safe
                    throw new Error(`Unexpected stock inconsistency for product ${item.productName}`);
                }
            }

            return { success: true };
        });
    }

    /**
     * Minimalist CRUD: Create Recipe
     */
    static async createRecipe(data: {
        name: string;
        servings: number;
        householdId: string;
        source?: RecipeSource;
        ingredients: { productId: string; quantity: number; unitId: string }[];
    }) {
        return await prisma.recipe.create({
            data: {
                name: data.name,
                servings: data.servings,
                householdId: data.householdId,
                source: data.source || RecipeSource.MANUAL,
                ingredients: {
                    create: data.ingredients.map(ing => ({
                        productId: ing.productId,
                        quantity: ing.quantity,
                        unitId: ing.unitId
                    }))
                }
            },
            include: {
                ingredients: true
            }
        });
    }
}
