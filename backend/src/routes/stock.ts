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
        // (First Expired First Out - prioritize items expiring sooner)
        const lotsWithBalance = await prisma.stockLotBalance.findMany({
            where: {
                householdId,
                productId,
                remainingQuantity: { gt: 0 },
            },
            orderBy: [
                { bestBeforeDate: 'asc' },  // Expiring first
                { purchasedAt: 'asc' },      // Then oldest
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
                    amount: -consumeAmount, // Negative for consumption
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

        // Check if already opened
        const balance = await prisma.stockLotBalance.findUnique({
            where: { stockLotId },
        });

        if (balance?.openedAt) {
            return { success: true, message: 'Already opened', openedAt: balance.openedAt };
        }

        // Create OPEN transaction (amount = 0, it's just an event)
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

        // Update projection
        await updateProjections(householdId, lot.productId, stockLotId, 0, 'OPEN');

        return {
            success: true,
            message: 'Lot marked as opened',
            openedAt: new Date(),
        };
    });
}
