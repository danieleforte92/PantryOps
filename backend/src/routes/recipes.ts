import { FastifyInstance } from 'fastify';
import z from 'zod';
import {
    createRecipe,
    addIngredientToRecipe,
    getRecipeById,
    getRecipes,
    getIngredientCategories
} from '../services/recipeService';

export async function recipeRoutes(app: FastifyInstance) {

    // CREATE RECIPE
    app.post('/', {
        schema: {
            body: z.object({
                name: z.string().min(2),
                servings: z.number().int().positive().optional(),
                householdId: z.string().uuid().optional(),
                ingredients: z.array(z.object({
                    productId: z.string().uuid().optional(),
                    ingredientCategoryId: z.string().uuid().optional(),
                    quantity: z.number().positive(),
                    unitId: z.string().uuid()
                })).optional()
            })
        }
    }, async (req) => {
        const { name, householdId, servings, ingredients } = req.body as {
            name: string;
            householdId?: string;
            servings?: number;
            ingredients?: {
                productId?: string;
                ingredientCategoryId?: string;
                quantity: number;
                unitId: string;
            }[]
        };
        return createRecipe(name, householdId, servings, ingredients);
    });

    // LIST RECIPES
    app.get('/', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid().optional()
            })
        }
    }, async (req) => {
        const { householdId } = req.query as { householdId?: string };
        return getRecipes(householdId);
    });

    // ADD INGREDIENT (DUAL MODE: category OR product)
    app.post('/:id/ingredients', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            }),
            body: z.object({
                // Almeno uno dei due è richiesto (validato a livello service)
                productId: z.string().uuid().optional(),
                ingredientCategoryId: z.string().uuid().optional(),
                quantity: z.number().positive()
            })
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const { productId, ingredientCategoryId, quantity } = req.body as {
            productId?: string;
            ingredientCategoryId?: string;
            quantity: number;
        };

        try {
            const result = await addIngredientToRecipe(id, quantity, {
                productId,
                ingredientCategoryId
            });
            return result;
        } catch (error: any) {
            // Gestione errori strutturati dal service
            if (error.code === 'RECIPE_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'PRODUCT_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'CATEGORY_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'INVALID_QUANTITY') {
                return reply.status(400).send({ error: error.code, message: error.message });
            }
            if (error.code === 'MISSING_IDENTIFIER') {
                return reply.status(400).send({ error: error.code, message: error.message });
            }
            // Errore generico
            return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Errore interno del server' });
        }
    });

    // GET RECIPE
    app.get('/:id', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            })
        }
    }, async (req) => {
        const { id } = req.params as { id: string };
        return getRecipeById(id);
    });

    // === NEW: INGREDIENT CATEGORIES ===

    // LIST INGREDIENT CATEGORIES
    app.get('/ingredient-categories', {
        schema: {
            querystring: z.object({
                householdId: z.string().uuid()
            })
        }
    }, async (req) => {
        const { householdId } = req.query as { householdId: string };
        return { categories: await getIngredientCategories(householdId) };
    });
}
