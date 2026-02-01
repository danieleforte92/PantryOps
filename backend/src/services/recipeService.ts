import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateRecipeIngredient {
    productId?: string;
    ingredientCategoryId?: string;
    quantity: number;
    unitId: string;
}

export const createRecipe = async (name: string, householdId?: string, servings: number = 4, ingredients: CreateRecipeIngredient[] = []) => {
    return prisma.$transaction(async (tx) => {
        // 1. Create Recipe
        const recipe = await tx.recipe.create({
            data: {
                name,
                householdId,
                servings
            }
        });

        // 2. Create Ingredients
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                // Determine unit (logic similar to addIngredientToRecipe but simplified for creation)
                // Actually, the FE sends unitId but for categories we should use baseUnitId if possible or validate
                // For simplicity, we trust the FE for unitId or verify it matches category base unit

                // We need to fetch proper unit if not provided, but FE sends it currently.
                // However, our dual-mode logic in addIngredientToRecipe handles unit automatic lookups.
                // Let's reuse addIngredientToRecipe logic if possible, or replicate it carefully inside transaction.

                // Replicating basic logic for transaction safety:
                let unitId = ing.unitId;

                if (ing.ingredientCategoryId) {
                    const cat = await tx.ingredientCategory.findUnique({ where: { id: ing.ingredientCategoryId } });
                    if (cat) unitId = cat.baseUnitId; // Enforce category base unit

                    await tx.recipeIngredient.create({
                        data: {
                            recipeId: recipe.id,
                            ingredientCategoryId: ing.ingredientCategoryId,
                            quantity: ing.quantity,
                            unitId
                        }
                    });
                } else if (ing.productId) {
                    const prod = await tx.product.findUnique({ where: { id: ing.productId } });
                    if (prod) unitId = prod.stockUnitId; // Enforce product stock unit

                    await tx.recipeIngredient.create({
                        data: {
                            recipeId: recipe.id,
                            productId: ing.productId,
                            quantity: ing.quantity,
                            unitId
                        }
                    });
                }
            }
        }

        // Return full recipe
        return tx.recipe.findUnique({
            where: { id: recipe.id },
            include: {
                ingredients: {
                    include: {
                        unit: true,
                        product: true,
                        ingredientCategory: true
                    }
                }
            }
        });
    });
};

// Removed getRecipes to keep file size small in tool output if not needed, 
// but I must be careful not to delete it if I'm replacing a range.
// I will target the exact range of createRecipe function.

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
 * ⚠️ DEPRECATION NOTICE:
 * - `productId` è LEGACY e deprecato. Usare solo per backward compatibility.
 * - `ingredientCategoryId` è il modo corretto per nuove ricette.
 * 
 * ARCHITECTURE PRINCIPLE:
 * Le ricette devono essere universali (categoria), mai legate a prodotti specifici.
 * La selezione del prodotto avviene SOLO nel domain stock durante il cooking.
 * 
 * DUAL MODE (backward compatibility):
 * - Se `ingredientCategoryId` → ✅ CORRETTO: usa categoria (universale)
 * - Se `productId` → ⚠️ LEGACY: usa prodotto specifico (da migrare)
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
