import { FastifyInstance } from 'fastify';
import z from 'zod';
import {
    createRecipe,
    addIngredientToRecipe,
    getRecipeById
} from '../services/recipeService';

export async function recipeRoutes(app: FastifyInstance) {

    // CREATE RECIPE
    app.post('/', {
        schema: {
            body: z.object({
                name: z.string().min(2),
                servings: z.number().int().positive().optional()
            })
        }
    }, async (req) => {
        const { name } = req.body as { name: string };
        return createRecipe(name);
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
    }, async (req) => {
        const { id } = req.params as { id: string };
        const { productId, quantity } = req.body as {
            productId: string;
            quantity: number;
        };

        return addIngredientToRecipe(id, productId, quantity);
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
