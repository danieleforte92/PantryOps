import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { updateProjections } from '../services/projections';
import { resolveCategoryStock } from '../services/categoryService';

const purchaseSchema = z.object({
    householdId: z.string().uuid(),
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    locationId: z.string().uuid().optional(),
    bestBeforeDate: z.string().datetime().optional(),
    price: z.number().positive().optional(),
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

export async function stockRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // COMMAND: Purchase (add stock)
    fastify.post('/purchase', {
        schema: { body: purchaseSchema },
    }, async (request) => {
        const { householdId, userId, productId, quantity, locationId, bestBeforeDate } = request.body;

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

        return {
            success: true,
            lot: result.lot,
            transaction: result.transaction,
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

        const householdId = (await prisma.household.findFirst())?.id; // Mock auth
        if (!householdId) return reply.status(400).send({ error: 'No household found' });

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

        const actualServings = (recipe as any).servings || 1;
        const factor = servings ? (servings / actualServings) : 1;

        // Build allocation plan
        let allocationPlan: Array<{
            productId: string;
            categoryId?: string;
            required: number;
            lots: Array<{ lotId: string; amount: number }>;
        }> = [];

        for (const ing of recipe.ingredients) {
            const required = ing.quantity * factor;

            if (ing.productId) {
                // LEGACY: Product based - use FEFO within product
                const available = ing.product.currentStock?.quantity || 0;

                if (available < required) {
                    return reply.status(400).send({
                        error: 'STOCK_INSUFFICIENT',
                        product: ing.product.name,
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
                            error: 'INSUFFICIENT_SELECTION',
                            category: ing.ingredientCategory?.name,
                            required,
                            selected: totalSelected
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

                        allocationPlan.push({
                            productId: sel.productId,
                            categoryId: ing.ingredientCategoryId,
                            required: sel.quantity,
                            lots: lotAllocations
                        });
                    }

                } else {
                    // AUTO-FEFO: No user selection, use category resolution
                    const resolution = await resolveCategoryStock(
                        ing.ingredientCategoryId,
                        householdId
                    );

                    const availableTotal = resolution.totalAvailable;

                    if (availableTotal < required) {
                        return reply.status(400).send({
                            error: 'STOCK_INSUFFICIENT',
                            category: ing.ingredientCategory?.name,
                            required,
                            available: availableTotal
                        });
                    }

                    // Allocate across products by priority + stock
                    let remainingRequired = required;
                    for (const sp of resolution.suggestedProducts) {
                        if (remainingRequired <= 0) break;

                        const lots = await prisma.stockLotBalance.findMany({
                            where: {
                                householdId,
                                productId: sp.productId,
                                remainingQuantity: { gt: 0 }
                            },
                            orderBy: [
                                { bestBeforeDate: 'asc' },
                                { purchasedAt: 'asc' }
                            ]
                        });

                        let remaining = Math.min(sp.availableQuantity, remainingRequired);
                        const lotAllocations = [];
                        for (const lot of lots) {
                            if (remaining <= 0) break;
                            const consumeAmount = Math.min(lot.remainingQuantity, remaining);
                            lotAllocations.push({ lotId: lot.stockLotId, amount: consumeAmount });
                            remaining -= consumeAmount;
                        }

                        allocationPlan.push({
                            productId: sp.productId,
                            categoryId: ing.ingredientCategoryId,
                            required: Math.min(sp.availableQuantity, remainingRequired),
                            lots: lotAllocations
                        });

                        remainingRequired -= Math.min(sp.availableQuantity, remainingRequired);
                    }
                }
            }
        }

        // Execute consumption in transaction
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

            await updateProjections(householdId);
        });

        return { success: true };
    });
}
