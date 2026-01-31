/**
 * Categories Routes for BetterGrocy
 * 
 * RESTful API endpoints for managing product-category mappings:
 * - CRUD operations for ProductIngredientCategory
 * - Priority management
 * - Bulk queries for UI optimization
 * 
 * All endpoints are household-scoped for multi-tenancy.
 */

import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';
import {
  getProductCategories,
  assignProductToCategory,
  removeProductFromCategory,
  updateCategoryPriority,
  getProductsByCategory,
  getPreferredProductWithStock,
  getAllCategoriesWithMappings,
  getCategoryWithProducts,
} from '../services/categoryService';

// ============================================================================
// Validation Schemas
// ============================================================================

const assignProductSchema = z.object({
  productId: z.string().uuid(),
  priority: z.number().int().min(0).optional(),
});

const updatePrioritySchema = z.object({
  priority: z.number().int().min(0),
});

const householdIdQuery = z.object({
  householdId: z.string().uuid(),
});

// ============================================================================
// Error Handler
// ============================================================================

function handleServiceError(error: unknown, reply: any) {
  if (error && typeof error === 'object' && 'code' in error) {
    const serviceError = error as { code: string; message: string; statusCode: number };
    return reply.status(serviceError.statusCode).send({
      error: serviceError.code,
      message: serviceError.message,
    });
  }

  console.error('Unexpected error:', error);
  return reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

// ============================================================================
// Routes
// ============================================================================

export async function categoryRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  // ==========================================================================
  // Category List & Details
  // ==========================================================================

  /**
   * GET /api/categories
   * List all categories for a household
   */
  fastify.get('/', {
    schema: {
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { householdId } = request.query;

    try {
      const categories = await prisma.ingredientCategory.findMany({
        where: { householdId },
        include: {
          baseUnit: {
            select: { id: true, name: true, abbreviation: true },
          },
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return {
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          baseUnit: cat.baseUnit,
          productCount: cat._count.products,
        })),
      };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  /**
   * GET /api/categories/:id
   * Get single category with products
   */
  fastify.get('/:id', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { householdId } = request.query;

    try {
      const category = await getCategoryWithProducts(id, householdId);
      return { category };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // ==========================================================================
  // Product-Category Mapping Operations
  // ==========================================================================

  /**
   * GET /api/categories/:id/products
   * Get all products in a category (sorted by priority)
   */
  fastify.get('/:id/products', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { householdId } = request.query;

    try {
      const products = await getProductsByCategory(id, householdId);
      return { products };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  /**
   * POST /api/categories/:id/products
   * Assign a product to this category
   */
  fastify.post('/:id/products', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: householdIdQuery,
      body: assignProductSchema,
    },
  }, async (request, reply) => {
    const { id: categoryId } = request.params;
    const { householdId } = request.query;
    const { productId, priority } = request.body;

    try {
      const mapping = await assignProductToCategory(
        productId,
        categoryId,
        householdId,
        priority
      );

      return reply.status(201).send({
        message: 'Product assigned to category successfully',
        mapping,
      });
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  /**
   * DELETE /api/categories/:id/products/:productId
   * Remove a product from this category
   */
  fastify.delete('/:id/products/:productId', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
        productId: z.string().uuid(),
      }),
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { id: categoryId, productId } = request.params;
    const { householdId } = request.query;

    try {
      await removeProductFromCategory(productId, categoryId, householdId);

      return {
        message: 'Product removed from category successfully',
        success: true,
      };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  /**
   * PATCH /api/categories/:id/products/:productId/priority
   * Update priority of a product in this category
   */
  fastify.patch('/:id/products/:productId/priority', {
    schema: {
      params: z.object({
        id: z.string().uuid(),
        productId: z.string().uuid(),
      }),
      querystring: householdIdQuery,
      body: updatePrioritySchema,
    },
  }, async (request, reply) => {
    const { id: categoryId, productId } = request.params;
    const { householdId } = request.query;
    const { priority } = request.body;

    try {
      const mapping = await updateCategoryPriority(
        productId,
        categoryId,
        householdId,
        priority
      );

      return {
        message: 'Priority updated successfully',
        mapping,
      };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  /**
   * GET /api/categories/:id/preferred-product
   * Get the preferred product in this category with stock
   * Used for FEFO/suggestion logic
   */
  fastify.get('/:id/preferred-product', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { householdId } = request.query;

    try {
      const product = await getPreferredProductWithStock(id, householdId);

      if (!product) {
        return reply.status(404).send({
          error: 'NO_AVAILABLE_PRODUCT',
          message: 'No products with stock available in this category',
        });
      }

      return { product };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * GET /api/categories/mapped
   * Get all categories with their products (bulk load for UI)
   */
  fastify.get('/mapped', {
    schema: {
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { householdId } = request.query;

    try {
      const categories = await getAllCategoriesWithMappings(householdId);
      return { categories };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });

  // ==========================================================================
  // Product-Centric Operations
  // ==========================================================================

  /**
   * GET /api/products/:id/categories
   * Get all categories assigned to a product
   */
  fastify.get('/api/products/:id/categories', {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      querystring: householdIdQuery,
    },
  }, async (request, reply) => {
    const { id: productId } = request.params;
    const { householdId } = request.query;

    try {
      const mappings = await getProductCategories(productId, householdId);
      return { mappings };
    } catch (error) {
      return handleServiceError(error, reply);
    }
  });
}
