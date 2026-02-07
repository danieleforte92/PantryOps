import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateRecipeIngredient {
    ingredientCategoryId?: string;
    quantity: number;
    unitId?: string;
    productId?: string;
}

export const createRecipe = async (
    name: string,
    householdId?: string,
    servings: number = 4,
    ingredients: CreateRecipeIngredient[] = [],
    description?: string
) => {
    return prisma.$transaction(async (tx) => {
        // 1. Create Recipe
        const recipe = await tx.recipe.create({
            data: {
                name,
                householdId,
                servings,
                ...(description ? { description } : {})
            }
        });

        // 2. Create Ingredients (category-based only)
        if (ingredients && ingredients.length > 0) {
            for (const ing of ingredients) {
                if (ing.productId) {
                    throw { code: 'LEGACY_PRODUCT_NOT_ALLOWED', message: 'Non usare productId per nuove ricette' };
                }

                if (!ing.ingredientCategoryId) {
                    throw { code: 'MISSING_IDENTIFIER', message: 'Devi specificare ingredientCategoryId' };
                }

                const cat = await tx.ingredientCategory.findUnique({ where: { id: ing.ingredientCategoryId } });
                if (!cat) {
                    throw { code: 'CATEGORY_NOT_FOUND', message: 'Categoria ingrediente non trovata' };
                }

                const unitId = cat.baseUnitId; // Enforce category base unit

                await tx.recipeIngredient.create({
                    data: {
                        recipeId: recipe.id,
                        ingredientCategoryId: ing.ingredientCategoryId,
                        quantity: ing.quantity,
                        unitId
                    }
                });
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

    if (productId) {
        throw { code: 'LEGACY_PRODUCT_NOT_ALLOWED', message: 'Non usare productId per nuove ricette' };
    }

    // Validazione: almeno uno richiesto
    if (!ingredientCategoryId) {
        throw { code: 'MISSING_IDENTIFIER', message: 'Devi specificare ingredientCategoryId' };
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
