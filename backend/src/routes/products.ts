import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { getProductByBarcode } from '../services/openfoodfacts';

const createProductSchema = z.object({
    householdId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
    stockUnitId: z.string().uuid(),
    purchaseUnitId: z.string().uuid(),
    purchaseToStockFactor: z.number().positive().default(1),
    defaultLocationId: z.string().uuid().optional(),
    minStockAmount: z.number().positive().optional(),
    shelfLifeDays: z.number().int().positive().optional(),
    openedShelfLifeDays: z.number().int().positive().optional(),
    barcode: z.string().optional(),
});

export async function productRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // Scan barcode - returns product or OFF suggestion
    fastify.get('/scan/:code', {
        schema: {
            params: z.object({
                code: z.string().min(3).max(20),
            }),
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request, reply) => {
        const { code } = request.params;
        const { householdId } = request.query;

        // 1. Check local database first
        const barcode = await prisma.barcode.findUnique({
            where: { code },
            include: {
                product: {
                    include: {
                        stockUnit: true,
                        purchaseUnit: true,
                        defaultLocation: true,
                        currentStock: true,
                    },
                },
            },
        });

        if (barcode && barcode.product.householdId === householdId) {
            return {
                status: 'KNOWN',
                source: 'local',
                product: barcode.product,
            };
        }

        // 2. Try OpenFoodFacts
        const offResult = await getProductByBarcode(code);

        if (offResult) {
            return {
                status: 'SUGGESTED',
                source: 'openfoodfacts',
                suggestion: offResult,
                barcode: code,
            };
        }

        // 3. Not found anywhere
        return reply.status(404).send({
            status: 'UNKNOWN',
            message: 'Product not found',
            barcode: code,
        });
    });

    // Create new product
    fastify.post('/', {
        schema: {
            body: createProductSchema,
        },
    }, async (request) => {
        const { barcode, ...productData } = request.body;

        const product = await prisma.product.create({
            data: {
                ...productData,
                barcodes: barcode ? {
                    create: { code: barcode },
                } : undefined,
            },
            include: {
                stockUnit: true,
                purchaseUnit: true,
                defaultLocation: true,
            },
        });

        return { product };
    });

    // Get all products for household
    fastify.get('/', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.query;

        const products = await prisma.product.findMany({
            where: { householdId },
            include: {
                stockUnit: true,
                purchaseUnit: true,
                currentStock: true,
            },
            orderBy: { name: 'asc' },
        });

        return { products };
    });

    // Get units (for product creation)
    fastify.get('/units', async () => {
        const units = await prisma.unit.findMany({
            orderBy: { name: 'asc' },
        });
        return { units };
    });

    // Get locations for household
    fastify.get('/locations', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.query;

        const locations = await prisma.location.findMany({
            where: { householdId },
            orderBy: { name: 'asc' },
        });

        return { locations };
    });
}
