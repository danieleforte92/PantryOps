import { FastifyInstance } from 'fastify';
import z from 'zod';
import {
    createRecipe,
    addIngredientToRecipe,
    getRecipeById,
    getRecipes,
    getIngredientCategories
} from '../services/recipeService';
import { trackActivity } from '../services/gamificationService';

export async function recipeRoutes(app: FastifyInstance) {

    // CREATE RECIPE
    app.post('/', {
        schema: {
            body: z.object({
                name: z.string().min(2),
                description: z.string().max(2000).optional(),
                servings: z.number().int().positive().optional(),
                householdId: z.string().uuid().optional(),
                userId: z.string().uuid(),
                ingredients: z.array(z.object({
                    ingredientCategoryId: z.string().uuid(),
                    quantity: z.number().positive(),
                    unitId: z.string().uuid().optional(),
                    productId: z.string().uuid().optional()
                })).optional()
            })
        }
    }, async (req, reply) => {
        const { name, description, householdId, userId, servings, ingredients } = req.body as {
            name: string;
            description?: string;
            householdId?: string;
            userId: string;
            servings?: number;
            ingredients?: {
                ingredientCategoryId?: string;
                quantity: number;
                unitId?: string;
                productId?: string;
            }[]
        };
        if (ingredients?.some((i) => i.productId)) {
            return {
                error: 'LEGACY_PRODUCT_NOT_ALLOWED',
                message: 'Non usare productId per nuove ricette; usa ingredientCategoryId'
            };
        }
        try {
            const result = await createRecipe(name, householdId, servings, ingredients, description);
            // Track gamification
            if (userId && householdId) {
                await trackActivity(userId, householdId, 'RECIPE_CREATE');
            }

            return result;
        } catch (error: any) {
            if (error.code === 'CATEGORY_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'MISSING_IDENTIFIER') {
                return reply.status(400).send({ error: error.code, message: error.message });
            }
            if (error.code === 'LEGACY_PRODUCT_NOT_ALLOWED') {
                return reply.status(400).send({ error: error.code, message: error.message });
            }
            return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Errore interno del server' });
        }
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

    // ADD INGREDIENT (category only)
    app.post('/:id/ingredients', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            }),
            body: z.object({
                ingredientCategoryId: z.string().uuid(),
                quantity: z.number().positive(),
                productId: z.string().uuid().optional()
            })
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const { productId, ingredientCategoryId, quantity } = req.body as {
            productId?: string;
            ingredientCategoryId?: string;
            quantity: number;
        };

        if (productId) {
            return reply.status(400).send({
                error: 'LEGACY_PRODUCT_NOT_ALLOWED',
                message: 'Non usare productId per nuove ricette; usa ingredientCategoryId'
            });
        }

        try {
            const result = await addIngredientToRecipe(id, quantity, {
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
            if (error.code === 'LEGACY_PRODUCT_NOT_ALLOWED') {
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
