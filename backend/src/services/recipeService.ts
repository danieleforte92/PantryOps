import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createRecipe = async (name: string) => {
    return prisma.recipe.create({
        data: { name },
        include: { ingredients: true }
    });
};

export const addIngredientToRecipe = async (
    recipeId: string,
    productId: string,
    quantity: number
) => {
    if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero');
    }

    const product = await prisma.product.findUnique({
        where: { id: productId }
    });

    if (!product) {
        throw new Error('Product not found');
    }

    return prisma.recipeIngredient.create({
        data: {
            recipeId,
            productId,
            quantity,
            unitId: product.stockUnitId
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
