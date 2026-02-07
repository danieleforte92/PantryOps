import prisma from '../lib/prisma';

type MigrationReport = {
    recipeIngredientId: string;
    productId?: string | null;
    issue: string;
};

async function run() {
    const legacyIngredients = await prisma.recipeIngredient.findMany({
        where: {
            productId: { not: null },
            ingredientCategoryId: null,
        },
        include: {
            product: true,
        },
    });

    let updatedCount = 0;
    let createdLegacyCategories = 0;
    let createdMappings = 0;
    const report: MigrationReport[] = [];

    for (const ing of legacyIngredients) {
        const product = ing.product;
        if (!product) {
            report.push({
                recipeIngredientId: ing.id,
                productId: ing.productId,
                issue: 'PRODUCT_NOT_FOUND',
            });
            continue;
        }

        const mappings = await prisma.productIngredientCategory.findMany({
            where: { productId: product.id },
            include: { ingredientCategory: true },
            orderBy: { priority: 'asc' },
        });

        const matching = mappings.find(
            (m) => m.ingredientCategory.baseUnitId === product.stockUnitId
        );

        let categoryId: string;
        let categoryBaseUnitId: string;

        if (matching) {
            categoryId = matching.ingredientCategoryId;
            categoryBaseUnitId = matching.ingredientCategory.baseUnitId;
        } else {
            const legacyName = `Legacy: ${product.name}`;
            let legacyCategory = await prisma.ingredientCategory.findFirst({
                where: {
                    householdId: product.householdId,
                    name: legacyName,
                },
            });

            if (!legacyCategory) {
                legacyCategory = await prisma.ingredientCategory.create({
                    data: {
                        householdId: product.householdId,
                        name: legacyName,
                        baseUnitId: product.stockUnitId,
                    },
                });
                createdLegacyCategories += 1;
            }

            categoryId = legacyCategory.id;
            categoryBaseUnitId = legacyCategory.baseUnitId;

            const existingMapping = await prisma.productIngredientCategory.findUnique({
                where: {
                    productId_ingredientCategoryId: {
                        productId: product.id,
                        ingredientCategoryId: categoryId,
                    },
                },
            });

            if (!existingMapping) {
                await prisma.productIngredientCategory.create({
                    data: {
                        productId: product.id,
                        ingredientCategoryId: categoryId,
                        priority: 1,
                    },
                });
                createdMappings += 1;
            }
        }

        await prisma.recipeIngredient.update({
            where: { id: ing.id },
            data: {
                ingredientCategoryId: categoryId,
                unitId: categoryBaseUnitId,
            },
        });

        updatedCount += 1;
    }

    console.log('[migrateRecipeIngredients] Legacy ingredients found:', legacyIngredients.length);
    console.log('[migrateRecipeIngredients] Updated:', updatedCount);
    console.log('[migrateRecipeIngredients] Legacy categories created:', createdLegacyCategories);
    console.log('[migrateRecipeIngredients] Mappings created:', createdMappings);

    if (report.length > 0) {
        console.warn('[migrateRecipeIngredients] Anomalies:', report);
    }
}

run()
    .catch((error) => {
        console.error('[migrateRecipeIngredients] Failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
