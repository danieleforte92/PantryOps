import prisma from '../lib/prisma';
import { StockTransactionType } from '@prisma/client';

/**
 * Update projections after a transaction
 * This keeps CurrentStock and StockLotBalance in sync with transactions
 */
export async function updateProjections(
    householdId: string,
    productId: string,
    stockLotId: string,
    amount: number,
    transactionType: StockTransactionType
) {
    // Update CurrentStock (aggregate per product)
    await prisma.currentStock.upsert({
        where: {
            householdId_productId: { householdId, productId },
        },
        update: {
            quantity: { increment: amount },
        },
        create: {
            householdId,
            productId,
            quantity: amount,
        },
    });

    // Update StockLotBalance
    const lot = await prisma.stockLot.findUnique({
        where: { id: stockLotId },
    });

    if (!lot) return;

    const existingBalance = await prisma.stockLotBalance.findUnique({
        where: { stockLotId },
    });

    if (existingBalance) {
        // Update existing balance
        const updateData: { remainingQuantity: { increment: number }; openedAt?: Date } = {
            remainingQuantity: { increment: amount },
        };

        // Mark as opened if this is an OPEN transaction
        if (transactionType === 'OPEN' && !existingBalance.openedAt) {
            updateData.openedAt = new Date();
        }

        await prisma.stockLotBalance.update({
            where: { stockLotId },
            data: updateData,
        });
    } else {
        // Create new balance
        await prisma.stockLotBalance.create({
            data: {
                stockLotId,
                householdId,
                productId,
                remainingQuantity: amount,
                bestBeforeDate: lot.bestBeforeDate,
                purchasedAt: lot.purchasedAt,
                openedAt: transactionType === 'OPEN' ? new Date() : null,
            },
        });
    }
}

/**
 * Rebuild all projections from transaction log
 * Use this if projections get out of sync
 */
export async function rebuildProjections(householdId: string) {
    // Clear existing projections
    await prisma.currentStock.deleteMany({ where: { householdId } });
    await prisma.stockLotBalance.deleteMany({ where: { householdId } });

    // Get all transactions ordered by time
    const transactions = await prisma.stockTransaction.findMany({
        where: { householdId },
        orderBy: { createdAt: 'asc' },
        include: { stockLot: true },
    });

    // Replay each transaction
    for (const tx of transactions) {
        await updateProjections(
            tx.householdId,
            tx.productId,
            tx.stockLotId,
            tx.amount,
            tx.type
        );
    }

    return { rebuilt: transactions.length };
}
