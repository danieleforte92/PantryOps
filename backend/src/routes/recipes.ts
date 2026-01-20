import { FastifyInstance } from 'fastify';
import z from 'zod';
import {
    createRecipe,
    addIngredientToRecipe,
    getRecipeById,
    getRecipes
} from '../services/recipeService';

export async function recipeRoutes(app: FastifyInstance) {

    // CREATE RECIPE
    app.post('/', {
        schema: {
            body: z.object({
                name: z.string().min(2),
                servings: z.number().int().positive().optional(),
                householdId: z.string().uuid().optional()
            })
        }
    }, async (req) => {
        const { name, householdId } = req.body as { name: string, householdId?: string };
        return createRecipe(name, householdId);
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

    // ADD INGREDIENT
    app.post('/:id/ingredients', {
        schema: {
            params: z.object({
                id: z.string().uuid()
            }),
            body: z.object({
                productId: z.string().uuid(),
                quantity: z.number().positive()
            })
        }
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const { productId, quantity } = req.body as {
            productId: string;
            quantity: number;
        };

        try {
            const result = await addIngredientToRecipe(id, productId, quantity);
            return result;
        } catch (error: any) {
            // Gestione errori strutturati dal service
            if (error.code === 'RECIPE_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'PRODUCT_NOT_FOUND') {
                return reply.status(404).send({ error: error.code, message: error.message });
            }
            if (error.code === 'INVALID_QUANTITY') {
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
}
