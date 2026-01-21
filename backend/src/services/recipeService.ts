import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createRecipe = async (name: string, householdId?: string) => {
    return prisma.recipe.create({
        data: {
            name,
            householdId
        },
        include: { ingredients: true }
    });
};

export const getRecipes = async (householdId?: string) => {
    return prisma.recipe.findMany({
        where: householdId ? { householdId } : {},
        include: {
            ingredients: {
                include: {
                    product: true,
                    unit: true,
                    ingredientCategory: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Aggiunge un ingrediente a una ricetta.
 * 
 * DUAL MODE:
 * - Se `ingredientCategoryId` → nuova ricetta (usa categoria)
 * - Se `productId` → legacy (usa prodotto specifico)
 * - Almeno uno dei due è richiesto
 */
export const addIngredientToRecipe = async (
    recipeId: string,
    quantity: number,
    options: {
        productId?: string;
        ingredientCategoryId?: string;
    }
) => {
    const { productId, ingredientCategoryId } = options;

    // Validazione: almeno uno richiesto
    if (!productId && !ingredientCategoryId) {
        throw { code: 'MISSING_IDENTIFIER', message: 'Devi specificare productId o ingredientCategoryId' };
    }

    if (quantity <= 0) {
        throw { code: 'INVALID_QUANTITY', message: 'La quantità deve essere maggiore di zero' };
    }

    // Verifica che la ricetta esista
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId }
    });

    if (!recipe) {
        throw { code: 'RECIPE_NOT_FOUND', message: 'Ricetta non trovata' };
    }

    let unitId: string;

    // DUAL MODE LOGIC
    if (ingredientCategoryId) {
        // === NEW MODE: Categoria ===
        const category = await prisma.ingredientCategory.findUnique({
            where: { id: ingredientCategoryId }
        });

        if (!category) {
            throw { code: 'CATEGORY_NOT_FOUND', message: 'Categoria ingrediente non trovata' };
        }

        unitId = category.baseUnitId;

        // Check idempotency per category
        const existing = await prisma.recipeIngredient.findFirst({
            where: { recipeId, ingredientCategoryId }
        });

        if (existing) {
            return prisma.recipeIngredient.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity },
                include: { ingredientCategory: true, unit: true }
            });
        }

        return prisma.recipeIngredient.create({
            data: {
                recipeId,
                ingredientCategoryId,
                quantity,
                unitId
            },
            include: { ingredientCategory: true, unit: true }
        });

    } else if (productId) {
        // === LEGACY MODE: Prodotto ===
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            throw { code: 'PRODUCT_NOT_FOUND', message: 'Prodotto non trovato' };
        }

        unitId = product.stockUnitId;

        // Check idempotency per product
        const existing = await prisma.recipeIngredient.findFirst({
            where: { recipeId, productId }
        });

        if (existing) {
            return prisma.recipeIngredient.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity },
                include: { product: true, unit: true }
            });
        }

        return prisma.recipeIngredient.create({
            data: {
                recipeId,
                productId,
                quantity,
                unitId
            },
            include: { product: true, unit: true }
        });
    }

    // Non dovrebbe mai arrivare qui
    throw { code: 'INTERNAL_ERROR', message: 'Errore interno' };
};

export const getRecipeById = async (id: string) => {
    return prisma.recipe.findUnique({
        where: { id },
        include: {
            ingredients: {
                include: {
                    product: true,
                    unit: true,
                    ingredientCategory: true
                }
            }
        }
    });
};

// === NEW: Ingredient Categories ===

export const getIngredientCategories = async (householdId: string) => {
    return prisma.ingredientCategory.findMany({
        where: { householdId },
        include: {
            baseUnit: true
        },
        orderBy: { name: 'asc' }
    });
};
