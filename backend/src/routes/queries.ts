import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';

export async function queryRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // Get current stock for all products
    fastify.get('/current-stock', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.query;

        const stock = await prisma.currentStock.findMany({
            where: {
                householdId,
                quantity: { gt: 0 },
            },
            include: {
                product: {
                    include: {
                        stockUnit: true,
                        purchaseUnit: true,
                    },
                },
            },
            orderBy: { product: { name: 'asc' } },
        });

        return { stock };
    });

    // Get expiring items (within N days)
    fastify.get('/expiring', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
                days: z.coerce.number().int().positive().default(7),
            }),
        },
    }, async (request) => {
        const { householdId, days } = request.query;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);

        const expiringLots = await prisma.stockLotBalance.findMany({
            where: {
                householdId,
                remainingQuantity: { gt: 0 },
                bestBeforeDate: {
                    not: null,
                    lte: expiryDate,
                },
            },
            include: {
                stockLot: {
                    include: {
                        product: {
                            include: { stockUnit: true },
                        },
                        location: true,
                    },
                },
            },
            orderBy: { bestBeforeDate: 'asc' },
        });

        // Group by urgency
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const expired = expiringLots.filter(l => l.bestBeforeDate! < now);
        const today = expiringLots.filter(l => l.bestBeforeDate! >= now && l.bestBeforeDate! < tomorrow);
        const thisWeek = expiringLots.filter(l => l.bestBeforeDate! >= tomorrow && l.bestBeforeDate! <= expiryDate);

        return {
            expired: expired.map(formatExpiringItem),
            today: today.map(formatExpiringItem),
            thisWeek: thisWeek.map(formatExpiringItem),
        };
    });

    // Get low stock items (below min threshold)
    fastify.get('/low-stock', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.query;

        // Get products with minStockAmount set
        const products = await prisma.product.findMany({
            where: {
                householdId,
                minStockAmount: { not: null },
            },
            include: {
                stockUnit: true,
                currentStock: true,
            },
        });

        const lowStock = products.filter(p => {
            const current = p.currentStock?.quantity ?? 0;
            return current < (p.minStockAmount ?? 0);
        }).map(p => ({
            product: {
                id: p.id,
                name: p.name,
                imageUrl: p.imageUrl,
                unit: p.stockUnit.abbreviation,
                nutriscore: p.nutriscore,
                novaGroup: p.novaGroup,
            },
            current: p.currentStock?.quantity ?? 0,
            minimum: p.minStockAmount!,
            needed: (p.minStockAmount ?? 0) - (p.currentStock?.quantity ?? 0),
        }));

        return { lowStock };
    });

    // Get shopping list (suggestions + manual items)
    fastify.get('/shopping-list', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.query;
        const { getSuggestions } = await import('../services/shoppingSuggestions');

        // Get auto-generated suggestions from low-stock products
        const suggestions = await getSuggestions(householdId);

        // Get manual shopping list items
        const manualItems = await prisma.shoppingListItem.findMany({
            where: {
                householdId,
                isSuggested: false,
            },
            include: {
                product: {
                    include: {
                        stockUnit: true,
                        purchaseUnit: true,
                        currentStock: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Get all shopping list items (including suggestions that were created)
        const allItems = await prisma.shoppingListItem.findMany({
            where: { householdId },
            include: {
                product: {
                    include: {
                        stockUnit: true,
                        purchaseUnit: true,
                        currentStock: true,
                    },
                },
            },
            orderBy: [
                { purchased: 'asc' },
                { createdAt: 'desc' },
            ],
        });

        const formattedSuggestions = suggestions.map(s => ({
            product: {
                id: s.productId,
                name: s.productName,
                imageUrl: s.productImage,
                nutriscore: (s as any).nutriscore,
                novaGroup: (s as any).novaGroup,
            },
            currentStock: s.currentStock,
            minStock: s.minStock,
            neededStockUnits: s.neededStockUnits,
            purchaseQuantity: s.purchaseQuantity,
            purchaseUnit: s.purchaseUnit,
            isSuggestion: true,
        }));

        const formattedManual = manualItems.map(item => ({
            id: item.id,
            product: {
                id: item.product.id,
                name: item.product.name,
                imageUrl: item.product.imageUrl,
                nutriscore: item.product.nutriscore,
                novaGroup: item.product.novaGroup,
            },
            quantity: item.quantity,
            purchased: item.purchased,
            purchasedAt: item.purchasedAt,
            isSuggested: item.isSuggested,
            purchaseUnit: item.product.purchaseUnit.abbreviation,
        }));

        const formattedAll = allItems.map(item => ({
            id: item.id,
            product: {
                id: item.product.id,
                name: item.product.name,
                imageUrl: item.product.imageUrl,
                nutriscore: item.product.nutriscore,
                novaGroup: item.product.novaGroup,
            },
            quantity: item.quantity,
            purchased: item.purchased,
            purchasedAt: item.purchasedAt,
            isSuggested: item.isSuggested,
            purchaseUnit: item.product.purchaseUnit.abbreviation,
        }));

        return {
            suggestions: formattedSuggestions,
            manualItems: formattedManual,
            all: formattedAll,
        };
    });
}

function formatExpiringItem(lot: any) {
    return {
        lotId: lot.stockLotId,
        product: {
            id: lot.stockLot.product.id,
            name: lot.stockLot.product.name,
            imageUrl: lot.stockLot.product.imageUrl,
            unit: lot.stockLot.product.stockUnit.abbreviation,
            nutriscore: lot.stockLot.product.nutriscore,
            novaGroup: lot.stockLot.product.novaGroup,
        },
        location: lot.stockLot.location.name,
        quantity: lot.remainingQuantity,
        bestBeforeDate: lot.bestBeforeDate,
        openedAt: lot.openedAt,
    };
}
