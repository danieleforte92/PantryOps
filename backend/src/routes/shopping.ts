import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';

const addItemSchema = z.object({
  householdId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  isSuggested: z.boolean().default(false),
});

const updateItemSchema = z.object({
  quantity: z.number().positive().min(0.1),
});

const togglePurchasedSchema = z.object({
  purchased: z.boolean(),
});

export async function shoppingRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // POST /api/shopping - Add item to shopping list
  fastify.post('/', {
    schema: { body: addItemSchema },
  }, async (request) => {
    const { householdId, productId, quantity, isSuggested } = request.body;

    const item = await prisma.shoppingListItem.upsert({
      where: {
        householdId_productId: { householdId, productId },
      },
      update: {
        quantity,
        isSuggested,
        purchased: false,
        purchasedAt: null,
      },
      create: {
        householdId,
        productId,
        quantity,
        isSuggested,
        purchased: false,
      },
      include: {
        product: {
          include: {
            stockUnit: true,
            purchaseUnit: true,
          },
        },
      },
    });

    return { item };
  });

  // DELETE /api/shopping/:id - Remove item from shopping list
  fastify.delete('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
    },
  }, async (request, reply) => {
    const { id } = request.params;

    await prisma.shoppingListItem.delete({
      where: { id },
    });

    return { success: true };
  });

  // PATCH /api/shopping/:id - Update item quantity
  fastify.patch('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: updateItemSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { quantity } = request.body;

    const item = await prisma.shoppingListItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: {
            stockUnit: true,
            purchaseUnit: true,
          },
        },
      },
    });

    return { item };
  });

  // PATCH /api/shopping/:id/purchased - Toggle purchased status
  fastify.patch('/:id/purchased', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      body: togglePurchasedSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { purchased } = request.body;

    const item = await prisma.shoppingListItem.update({
      where: { id },
      data: {
        purchased,
        purchasedAt: purchased ? new Date() : null,
      },
      include: {
        product: {
          include: {
            stockUnit: true,
            purchaseUnit: true,
          },
        },
      },
    });

    return { item };
  });

  // DELETE /api/shopping/purchased - Remove all purchased items
  fastify.delete('/purchased', {
    schema: {
      querystring: z.object({
        householdId: z.string().uuid(),
      }),
    },
  }, async (request) => {
    const { householdId } = request.query;

    const result = await prisma.shoppingListItem.deleteMany({
      where: {
        householdId,
        purchased: true,
      },
    });

    return { count: result.count };
  });

  // POST /api/shopping/sync-suggestions - Sync auto-generated suggestions
  fastify.post('/sync-suggestions', {
    schema: {
      body: z.object({
        householdId: z.string().uuid(),
      }),
    },
  }, async (request) => {
    const { householdId } = request.body;
    const { syncSuggestions } = await import('../services/shoppingSuggestions');

    const stats = await syncSuggestions(householdId);

    return stats;
  });
}
