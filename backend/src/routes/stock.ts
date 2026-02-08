import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { rebuildProjections, updateProjections } from '../services/projections';
import { resolveCategoryStock } from '../services/categoryService';
import { computeConsumption, validateConsumptionPlan } from '../services/consumptionEngine';
import { trackActivity } from '../services/gamificationService';

const purchaseSchema = z.object({
    householdId: z.string().uuid(),
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    locationId: z.string().uuid().optional(),
    bestBeforeDate: z.string().datetime().optional(),
    price: z.number().positive().optional(),
    isFirstScan: z.boolean().optional(),
});

const consumeSchema = z.object({
    householdId: z.string().uuid(),
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().positive(), // Amount in stock units
});

const openSchema = z.object({
    householdId: z.string().uuid(),
    userId: z.string().uuid(),
    stockLotId: z.string().uuid(),
});

const rebuildSchema = z.object({
    householdId: z.string().uuid(),
});

export async function stockRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // COMMAND: Purchase (add stock)
    fastify.post('/purchase', {
        schema: { body: purchaseSchema },
    }, async (request) => {
        const { householdId, userId, productId, quantity, locationId, bestBeforeDate, isFirstScan } = request.body;

        // Get product for unit conversion
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
        });

        // Convert purchase units to stock units
        const stockQuantity = quantity * product.purchaseToStockFactor;

        // Determine location
        const finalLocationId = locationId || product.defaultLocationId;
        if (!finalLocationId) {
            throw new Error('No location specified and product has no default location');
        }

        // Create lot + transaction in a single transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the physical lot
            const lot = await tx.stockLot.create({
                data: {
                    householdId,
                    productId,
                    locationId: finalLocationId,
                    bestBeforeDate: bestBeforeDate ? new Date(bestBeforeDate) : null,
                    purchasedAt: new Date(),
                },
            });

            // 2. Create PURCHASE transaction
            const transaction = await tx.stockTransaction.create({
                data: {
                    householdId,
                    productId,
                    stockLotId: lot.id,
                    type: 'PURCHASE',
                    amount: stockQuantity,
                    userId,
                },
            });

            return { lot, transaction };
        });

        // 3. Update projections (outside main transaction for performance)
        await updateProjections(householdId, productId, result.lot.id, stockQuantity, 'PURCHASE');

        // 4. Track first scan gamification
        let gamificationResult = null;
        if (isFirstScan) {
            gamificationResult = await trackActivity(userId, householdId, 'SCAN');
        }

        return {
            success: true,
            lot: result.lot,
            transaction: result.transaction,
            gamification: gamificationResult,
        };
    });

    // COMMAND: Consume (FEFO logic)
    fastify.post('/consume', {
        schema: { body: consumeSchema },
    }, async (request, reply) => {
        const { householdId, userId, productId, quantity } = request.body;

        let remaining = quantity;

        // Find lots with remaining stock, ordered by FEFO
        const lotsWithBalance = await prisma.stockLotBalance.findMany({
            where: {
                householdId,
                productId,
                remainingQuantity: { gt: 0 },
            },
            orderBy: [
                { bestBeforeDate: 'asc' },
                { purchasedAt: 'asc' },
            ],
        });

        if (lotsWithBalance.length === 0) {
            return reply.status(400).send({ error: 'STOCK_EMPTY', message: 'No stock available' });
        }

        const totalAvailable = lotsWithBalance.reduce((sum, l) => sum + l.remainingQuantity, 0);
        if (totalAvailable < quantity) {
            return reply.status(400).send({
                error: 'STOCK_INSUFFICIENT',
                message: `Only ${totalAvailable} available, requested ${quantity}`,
                available: totalAvailable,
            });
        }

        const consumedFromLots: { lotId: string; amount: number }[] = [];

        // Consume from lots in FEFO order
        for (const lot of lotsWithBalance) {
            if (remaining <= 0) break;

            const consumeAmount = Math.min(lot.remainingQuantity, remaining);

            // Create CONSUME transaction
            await prisma.stockTransaction.create({
                data: {
                    householdId,
                    productId,
                    stockLotId: lot.stockLotId,
                    type: 'CONSUME',
                    amount: -consumeAmount,
                    userId,
                },
            });

            // Update projection
            await updateProjections(householdId, productId, lot.stockLotId, -consumeAmount, 'CONSUME');

            consumedFromLots.push({ lotId: lot.stockLotId, amount: consumeAmount });
            remaining -= consumeAmount;
        }

        // Get updated stock
        const currentStock = await prisma.currentStock.findUnique({
            where: { householdId_productId: { householdId, productId } },
        });

        return {
            success: true,
            consumed: quantity,
            consumedFromLots,
            remainingStock: currentStock?.quantity ?? 0,
        };
    });

    // COMMAND: Open (mark lot as opened)
    fastify.post('/open', {
        schema: { body: openSchema },
    }, async (request) => {
        const { householdId, userId, stockLotId } = request.body;

        const lot = await prisma.stockLot.findUniqueOrThrow({
            where: { id: stockLotId },
        });

        const balance = await prisma.stockLotBalance.findUnique({
            where: { stockLotId },
        });

        if (balance?.openedAt) {
            return { success: true, message: 'Already opened', openedAt: balance.openedAt };
        }

        await prisma.stockTransaction.create({
            data: {
                householdId,
                productId: lot.productId,
                stockLotId,
                type: 'OPEN',
                amount: 0,
                userId,
            },
        });

        await updateProjections(householdId, lot.productId, stockLotId, 0, 'OPEN');

        return {
            success: true,
            message: 'Lot marked as opened',
            openedAt: new Date(),
        };
    });

    // COMMAND: Recipe Cook (Batch consumption)
    fastify.post('/recipe-cook/:id', {
        schema: {
            params: z.object({ id: z.string().uuid() }),
            body: z.object({
                userId: z.string().uuid(),
                servings: z.number().int().positive().optional(),
                productSelections: z.array(z.object({
                    categoryId: z.string().uuid().optional(),
                    productId: z.string().uuid(),
                    quantity: z.number().positive(),
                })).optional()
            })
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { userId, servings, productSelections } = request.body;

        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: {
                        product: {
                            include: { currentStock: true }
                        },
                        ingredientCategory: true
                    }
                }
            }
        });

        if (!recipe) return reply.status(404).send({ error: 'Recipe not found' });

        // Resolve household deterministically:
        // 1) household-scoped recipes use their own household
        // 2) global recipes fallback to user's first household
        let householdId = recipe.householdId;
        if (!householdId) {
            const userHousehold = await prisma.householdUser.findFirst({
                where: { userId },
                select: { householdId: true },
                orderBy: { role: 'asc' }, // ADMIN before MEMBER
            });
            householdId = userHousehold?.householdId ?? null;
        }

        if (!householdId) {
            return reply.status(400).send({
                error: 'HOUSEHOLD_NOT_FOUND',
                message: 'No household available for this recipe cook operation',
            });
        }

        // Ensure user belongs to the resolved household
        const membership = await prisma.householdUser.findUnique({
            where: {
                householdId_userId: {
                    householdId,
                    userId,
                },
            },
            select: { userId: true },
        });

        if (!membership) {
            return reply.status(403).send({
                error: 'HOUSEHOLD_FORBIDDEN',
                message: 'User is not a member of the recipe household',
            });
        }

        const actualServings = (recipe as any).servings || 1;
        const factor = servings ? (servings / actualServings) : 1;

        // Build allocation plan (legacy + user selections)
        let allocationPlan: Array<{
            productId: string;
            categoryId?: string;
            required: number;
            lots: Array<{ lotId: string; amount: number }>;
        }> = [];
        const autoCategoryIngredients: Array<{ categoryId: string; required: number }> = [];

        for (const ing of recipe.ingredients) {
            const required = ing.quantity * factor;

            if (ing.productId) {
                // LEGACY: Product based - use FEFO within product
                const available = ing.product?.currentStock?.quantity || 0;

                if (available < required) {
                    return reply.status(400).send({
                        error: 'STOCK_INSUFFICIENT',
                        product: ing.product?.name,
                        required,
                        available
                    });
                }

                // Get FEFO lots
                const lots = await prisma.stockLotBalance.findMany({
                    where: {
                        householdId,
                        productId: ing.productId,
                        remainingQuantity: { gt: 0 }
                    },
                    orderBy: [
                        { bestBeforeDate: 'asc' },
                        { purchasedAt: 'asc' }
                    ]
                });

                // Calculate lot allocation
                let remaining = required;
                const lotAllocations = [];
                for (const lot of lots) {
                    if (remaining <= 0) break;
                    const consumeAmount = Math.min(lot.remainingQuantity, remaining);
                    lotAllocations.push({ lotId: lot.stockLotId, amount: consumeAmount });
                    remaining -= consumeAmount;
                }

                allocationPlan.push({
                    productId: ing.productId,
                    required,
                    lots: lotAllocations
                });

                } else if (ing.ingredientCategoryId) {
                    // NEW: Category based
                    if (productSelections && productSelections.length > 0) {
                        // USER SELECTION: Use provided selections
                        const categorySelections = productSelections.filter(s => s.categoryId === ing.ingredientCategoryId);
                        const totalSelected = categorySelections.reduce((sum, s) => sum + s.quantity, 0);

                        if (totalSelected < required) {
                            return reply.status(400).send({
                                error: 'STOCK_INSUFFICIENT',
                                ingredientCategoryId: ing.ingredientCategoryId,
                                ingredientName: ing.ingredientCategory?.name,
                                required,
                                available: totalSelected,
                                missing: required - totalSelected
                            });
                        }

                        for (const sel of categorySelections) {
                        // For each selected product, get FEFO lots
                        const lots = await prisma.stockLotBalance.findMany({
                            where: {
                                householdId,
                                productId: sel.productId,
                                remainingQuantity: { gt: 0 }
                            },
                            orderBy: [
                                { bestBeforeDate: 'asc' },
                                { purchasedAt: 'asc' }
                            ]
                        });

                        let remaining = sel.quantity;
                        const lotAllocations = [];
                            for (const lot of lots) {
                                if (remaining <= 0) break;
                                const consumeAmount = Math.min(lot.remainingQuantity, remaining);
                                lotAllocations.push({ lotId: lot.stockLotId, amount: consumeAmount });
                                remaining -= consumeAmount;
                            }

                            if (remaining > 0) {
                                return reply.status(400).send({
                                    error: 'STOCK_INSUFFICIENT',
                                    ingredientCategoryId: ing.ingredientCategoryId,
                                    ingredientName: ing.ingredientCategory?.name,
                                    required: sel.quantity,
                                    available: sel.quantity - remaining,
                                    missing: remaining
                                });
                            }

                            allocationPlan.push({
                                productId: sel.productId,
                                categoryId: ing.ingredientCategoryId,
                                required: sel.quantity,
                            lots: lotAllocations
                        });
                    }

                } else {
                    // AUTO-FEFO: No user selection, validate via Consumption Engine
                    const consumptionPlan = await computeConsumption(
                        ing.ingredientCategoryId,
                        required,
                        householdId,
                        'preview'
                    );

                    const validation = validateConsumptionPlan(consumptionPlan, required);
                    if (!validation.valid) {
                        return reply.status(400).send({
                            error: 'STOCK_INSUFFICIENT',
                            ingredientCategoryId: ing.ingredientCategoryId,
                            ingredientName: ing.ingredientCategory?.name,
                            required,
                            available: consumptionPlan.totalAvailable,
                            missing: Math.max(0, required - consumptionPlan.totalAvailable)
                        });
                    }

                    autoCategoryIngredients.push({
                        categoryId: ing.ingredientCategoryId,
                        required
                    });
                }
            }
        }

        // Execute auto category consumption via Consumption Engine (commit mode)
        for (const auto of autoCategoryIngredients) {
            const plan = await computeConsumption(
                auto.categoryId,
                auto.required,
                householdId,
                'commit',
                userId
            );
            if (!plan.canFulfill) {
                return reply.status(400).send({
                    error: 'STOCK_INSUFFICIENT',
                    ingredientCategoryId: auto.categoryId,
                    ingredientName: plan.categoryName,
                    required: auto.required,
                    available: plan.totalAvailable,
                    missing: Math.max(0, auto.required - plan.totalAvailable)
                });
            }
        }

        // Execute legacy + user selection consumption in transaction
        if (allocationPlan.length > 0) {
            await prisma.$transaction(async (tx) => {
                for (const alloc of allocationPlan) {
                    for (const lotAlloc of alloc.lots) {
                        await tx.stockTransaction.create({
                            data: {
                                householdId,
                                productId: alloc.productId,
                                stockLotId: lotAlloc.lotId,
                                type: 'CONSUME',
                                amount: -lotAlloc.amount,
                                userId
                            }
                        });

                        await tx.currentStock.update({
                            where: { householdId_productId: { householdId, productId: alloc.productId } },
                            data: { quantity: { decrement: lotAlloc.amount } }
                        });

                        await tx.stockLotBalance.update({
                            where: { stockLotId: lotAlloc.lotId },
                            data: { remainingQuantity: { decrement: lotAlloc.amount } }
                        });
                    }
                }
            });
        }

        // Track gamification for cooking
        const gamificationResult = await trackActivity(userId, householdId, 'COOK', {
            recipeId: id,
            recipeName: recipe.name,
        });

        return {
            success: true,
            gamification: gamificationResult,
        };
    });

    // COMMAND: Convert tutorial product to real (add expiry date)
    fastify.post('/convert-tutorial/:lotId', {
        schema: {
            params: z.object({
                lotId: z.string().uuid(),
            }),
            body: z.object({
                bestBeforeDate: z.string().datetime(),
                userId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { lotId } = request.params;
        const { bestBeforeDate, userId } = request.body;

        // Get the tutorial lot
        const lot = await prisma.stockLot.findUniqueOrThrow({
            where: { id: lotId },
            include: {
                product: true,
            },
        });

        if (!lot.isTutorial) {
            throw new Error('This product is not in tutorial mode');
        }

        // Update the lot to be a real product
        await prisma.stockLot.update({
            where: { id: lotId },
            data: {
                isTutorial: false,
                bestBeforeDate: new Date(bestBeforeDate),
            },
        });

        // Update the balance to set the bestBeforeDate
        await prisma.stockLotBalance.update({
            where: { stockLotId: lotId },
            data: {
                bestBeforeDate: new Date(bestBeforeDate),
            },
        });

        // Award bonus points for organizing
        const profile = await prisma.userGamificationProfile.findUnique({
            where: { userId },
        });

        let bonusPoints = 5;
        let newBadge = null;

        if (profile) {
            // Increment organized products count
            const organizedCount = await prisma.stockLot.count({
                where: {
                    householdId: lot.householdId,
                    isTutorial: false,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                    },
                },
            });

            // Check if user organized all tutorial products (award extra)
            const remainingTutorials = await prisma.stockLot.count({
                where: {
                    householdId: lot.householdId,
                    isTutorial: true,
                },
            });

            if (remainingTutorials === 0) {
                // Bonus for organizing entire pantry
                bonusPoints = 25;

                // Check for "Organized" badge
                const hasOrganizedBadge = await prisma.badge.findFirst({
                    where: {
                        userId: profile.id,
                        type: 'ORGANIZED',
                    },
                });

                if (!hasOrganizedBadge) {
                    await prisma.badge.create({
                        data: {
                            userId: profile.id,
                            type: 'ORGANIZED',
                        },
                    });
                    newBadge = {
                        type: 'ORGANIZED',
                        name: 'Organizzato',
                        description: 'Hai organizzato tutta la tua dispensa',
                        icon: '📋',
                        points: 25,
                    };
                }
            }

            // Add points
            await prisma.userGamificationProfile.update({
                where: { userId },
                data: {
                    totalPoints: { increment: bonusPoints },
                },
            });
        }

        return {
            success: true,
            message: 'Product converted to real with expiry date',
            bonusPoints,
            newBadge,
        };
    });

    // MAINTENANCE: Rebuild projections for a household
    fastify.post('/rebuild-projections', {
        schema: {
            body: rebuildSchema,
        },
    }, async (request) => {
        const { householdId } = request.body;
        const result = await rebuildProjections(householdId);
        return { rebuilt: result.rebuilt };
    });
}
