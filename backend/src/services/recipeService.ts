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
                    unit: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const addIngredientToRecipe = async (
    recipeId: string,
    productId: string,
    quantity: number
) => {
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

    // Verifica che il prodotto esista
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });

    if (!product) {
        throw { code: 'PRODUCT_NOT_FOUND', message: 'Prodotto non trovato' };
    }

    // IDEMPOTENT: controlla se l'ingrediente è già presente
    const existingIngredient = await prisma.recipeIngredient.findFirst({
        where: { recipeId, productId }
    });

    if (existingIngredient) {
        // Aggiorna la quantità esistente invece di creare un duplicato
        return prisma.recipeIngredient.update({
            where: { id: existingIngredient.id },
            data: { quantity: existingIngredient.quantity + quantity },
            include: {
                product: true,
                unit: true
            }
        });
    }

    // Crea nuovo ingrediente
    return prisma.recipeIngredient.create({
        data: {
            recipeId,
            productId,
            quantity,
            unitId: product.stockUnitId
        },
        include: {
            product: true,
            unit: true
        }
    });
};


export const getRecipeById = async (id: string) => {
    return prisma.recipe.findUnique({
        where: { id },
        include: {
            ingredients: {
                include: {
                    product: true,
                    unit: true
                }
            }
        }
    });
};
