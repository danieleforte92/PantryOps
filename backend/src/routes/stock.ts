import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { updateProjections } from '../services/projections';

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
                servings: z.number().int().positive().optional()
            })
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { userId, servings } = request.body;

        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: {
                    include: {
                        product: {
                            include: { currentStock: true }
                        }
                    }
                }
            }
        });

        if (!recipe) return reply.status(404).send({ error: 'Recipe not found' });

        const householdId = (await prisma.household.findFirst())?.id; // Mock auth
        if (!householdId) return reply.status(400).send({ error: 'No household found' });

        const actualServings = (recipe as any).servings || 1;
        const factor = servings ? (servings / actualServings) : 1;

        for (const ing of recipe.ingredients) {
            const required = ing.quantity * factor;
            const available = ing.product.currentStock?.quantity || 0;
            if (available < required) {
                return reply.status(400).send({
                    error: 'STOCK_INSUFFICIENT',
                    product: ing.product.name,
                    required,
                    available
                });
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const ing of recipe.ingredients) {
                const required = ing.quantity * factor;
                let remaining = required;

                const lots = await tx.stockLotBalance.findMany({
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

                for (const lot of lots) {
                    if (remaining <= 0) break;
                    const consumeAmount = Math.min(lot.remainingQuantity, remaining);

                    await tx.stockTransaction.create({
                        data: {
                            householdId,
                            productId: ing.productId,
                            stockLotId: lot.stockLotId,
                            type: 'CONSUME',
                            amount: -consumeAmount,
                            userId
                        }
                    });

                    await tx.currentStock.update({
                        where: { householdId_productId: { householdId, productId: ing.productId } },
                        data: { quantity: { decrement: consumeAmount } }
                    });

                    await tx.stockLotBalance.update({
                        where: { stockLotId: lot.stockLotId },
                        data: { remainingQuantity: { decrement: consumeAmount } }
                    });

                    remaining -= consumeAmount;
                }
            }
        });

        return { success: true };
    });
}
