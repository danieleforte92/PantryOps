import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';

// Tutorial products that are commonly found in homes
const TUTORIAL_PRODUCTS = [
    {
        name: 'Pasta',
        defaultCategory: 'Pasta secca',
        defaultQuantity: 500,
        unitName: 'Grammi',
        shelfLifeDays: 730,
    },
    {
        name: 'Pomodori pelati',
        defaultCategory: 'Salsa di pomodoro',
        defaultQuantity: 400,
        unitName: 'Grammi',
        shelfLifeDays: 365,
    },
    {
        name: 'Olio extravergine',
        defaultCategory: 'Olio',
        defaultQuantity: 750,
        unitName: 'Millilitri',
        shelfLifeDays: 547,
    },
    {
        name: 'Pane',
        defaultCategory: 'Pane',
        defaultQuantity: 1,
        unitName: 'Confezione',
        shelfLifeDays: 5,
    },
    {
        name: 'Latte',
        defaultCategory: 'Latte',
        defaultQuantity: 1,
        unitName: 'Litro',
        shelfLifeDays: 7,
    },
    {
        name: 'Uova',
        defaultCategory: 'Uova',
        defaultQuantity: 6,
        unitName: 'Pezzi',
        shelfLifeDays: 28,
    },
    {
        name: 'Formaggio',
        defaultCategory: 'Formaggio',
        defaultQuantity: 250,
        unitName: 'Grammi',
        shelfLifeDays: 14,
    },
    {
        name: 'Pollo',
        defaultCategory: 'Carne bianca',
        defaultQuantity: 500,
        unitName: 'Grammi',
        shelfLifeDays: 2,
    },
];

// Schema for setting up tutorial products
const setupProductsSchema = z.object({
    householdId: z.string(),
    userId: z.string(),
    selectedProducts: z.array(z.object({
        name: z.string(),
        confirmed: z.boolean(),
        quantity: z.number().optional(),
    })),
});

// Schema for updating onboarding step
const updateStepSchema = z.object({
    userId: z.string(),
    step: z.number().min(0).max(4),
});

export async function onboardingRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // Get tutorial products list
    fastify.get('/tutorial-products', async () => {
        return {
            products: TUTORIAL_PRODUCTS,
        };
    });

    // Get current onboarding status
    fastify.get('/status', {
        schema: {
            querystring: z.object({
                userId: z.string(),
            }),
        },
    }, async (request) => {
        const { userId } = request.query;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                onboardingStep: true,
                gamificationProfile: {
                    include: {
                        badges: true,
                    },
                },
            },
        });

        if (!user) {
            return { error: 'User not found', step: 0 };
        }

        return {
            step: user.onboardingStep,
            gamification: user.gamificationProfile,
        };
    });

    // Update onboarding step
    fastify.patch('/progress', {
        schema: {
            body: updateStepSchema,
        },
    }, async (request) => {
        const { userId, step } = request.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: step },
            select: {
                id: true,
                onboardingStep: true,
            },
        });

        return {
            message: 'Onboarding step updated',
            step: user.onboardingStep,
        };
    });

    // Setup tutorial products (bulk add selected products)
    fastify.post('/setup-products', {
        schema: {
            body: setupProductsSchema,
        },
    }, async (request) => {
        const { householdId, userId, selectedProducts } = request.body;

        // Get or create default location (Dispensa)
        let defaultLocation = await prisma.location.findFirst({
            where: {
                householdId,
                name: 'Dispensa',
            },
        });

        if (!defaultLocation) {
            defaultLocation = await prisma.location.create({
                data: {
                    householdId,
                    name: 'Dispensa',
                    isFreezer: false,
                },
            });
        }

        // Get units
        const units = await prisma.unit.findMany();
        const unitMap = new Map(units.map(u => [u.name, u.id]));

        const confirmedProducts = selectedProducts.filter(p => p.confirmed);
        const createdProducts = [];

        for (const selected of confirmedProducts) {
            const tutorialProduct = TUTORIAL_PRODUCTS.find(p => p.name === selected.name);
            if (!tutorialProduct) continue;

            const unitId = unitMap.get(tutorialProduct.unitName);
            if (!unitId) continue;

            // Find or create category
            let category = await prisma.ingredientCategory.findFirst({
                where: {
                    householdId,
                    name: tutorialProduct.defaultCategory,
                },
            });

            if (!category) {
                category = await prisma.ingredientCategory.create({
                    data: {
                        householdId,
                        name: tutorialProduct.defaultCategory,
                        baseUnitId: unitId,
                    },
                });
            }

            // Create product
            const product = await prisma.product.create({
                data: {
                    householdId,
                    name: `${tutorialProduct.name} (Tutorial)`,
                    stockUnitId: unitId,
                    purchaseUnitId: unitId,
                    defaultLocationId: defaultLocation.id,
                    shelfLifeDays: tutorialProduct.shelfLifeDays,
                    productIngredientCategories: {
                        create: {
                            ingredientCategoryId: category.id,
                            priority: 1,
                        },
                    },
                },
            });

            // Create tutorial stock lot
            const stockLot = await prisma.stockLot.create({
                data: {
                    householdId,
                    productId: product.id,
                    locationId: defaultLocation.id,
                    isTutorial: true,
                },
            });

            // Create PURCHASE transaction
            const quantity = selected.quantity || tutorialProduct.defaultQuantity;
            await prisma.stockTransaction.create({
                data: {
                    householdId,
                    productId: product.id,
                    stockLotId: stockLot.id,
                    type: 'PURCHASE',
                    amount: quantity,
                    userId,
                },
            });

            createdProducts.push({
                productId: product.id,
                name: product.name,
                quantity,
            });
        }

        // Update onboarding step to 2 (products added)
        await prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: 2 },
        });

        // Create or update gamification profile
        await prisma.userGamificationProfile.upsert({
            where: { userId },
            create: {
                userId,
                householdId,
                tutorialProductsAdded: createdProducts.length,
                totalPoints: createdProducts.length * 5, // 5 points per product
            },
            update: {
                tutorialProductsAdded: createdProducts.length,
                totalPoints: {
                    increment: createdProducts.length * 5,
                },
            },
        });

        // Award "First Products" badge if 3+ products
        if (createdProducts.length >= 3) {
            const existingBadge = await prisma.badge.findFirst({
                where: {
                    userId: (await prisma.userGamificationProfile.findUnique({
                        where: { userId },
                    }))?.id || '',
                    type: 'FIRST_PRODUCTS',
                },
            });

            if (!existingBadge) {
                const profile = await prisma.userGamificationProfile.findUnique({
                    where: { userId },
                });
                if (profile) {
                    await prisma.badge.create({
                        data: {
                            userId: profile.id,
                            type: 'FIRST_PRODUCTS',
                        },
                    });
                }
            }
        }

        return {
            message: 'Tutorial products added successfully',
            productsAdded: createdProducts.length,
            products: createdProducts,
            pointsEarned: createdProducts.length * 5,
        };
    });

    // Complete onboarding (skip to end)
    fastify.post('/skip', {
        schema: {
            body: z.object({
                userId: z.string(),
            }),
        },
    }, async (request) => {
        const { userId } = request.body;

        await prisma.user.update({
            where: { id: userId },
            data: { onboardingStep: 4 },
        });

        return {
            message: 'Onboarding skipped',
            step: 4,
        };
    });
}
