/**
 * Category Service for PantryOps
 * 
 * Handles all business logic for product-category mappings:
 * - CRUD operations for ProductIngredientCategory
 * - Priority management
 * - Query optimization for UI
 * - FEFO preparation for cooking logic
 * 
 * All operations are household-scoped for multi-tenancy.
 */

import prisma from '../lib/prisma';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CategoryMapping {
  categoryId: string;
  categoryName: string;
  baseUnitId: string;
  baseUnitName: string;
  baseUnitAbbreviation: string;
  priority: number;
  createdAt: Date;
}

export interface ProductInCategory {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priority: number;
  currentStock: number;
  stockUnitId: string;
  stockUnitName: string;
}

export interface CategoryWithProducts {
  id: string;
  name: string;
  baseUnit: {
    id: string;
    name: string;
    abbreviation: string;
  };
  products: ProductInCategory[];
}

// ============================================================================
// Error Types
// ============================================================================

interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
}

function createError(code: string, message: string, statusCode: number): ServiceError {
  return { code, message, statusCode };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Verify product belongs to household
 */
async function validateProductOwnership(productId: string, householdId: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, householdId },
    select: { id: true },
  });

  if (!product) {
    throw createError('PRODUCT_NOT_FOUND', 'Product not found in this household', 404);
  }
}

/**
 * Verify category belongs to household
 */
async function validateCategoryOwnership(categoryId: string, householdId: string): Promise<void> {
  const category = await prisma.ingredientCategory.findFirst({
    where: { id: categoryId, householdId },
    select: { id: true },
  });

  if (!category) {
    throw createError('CATEGORY_NOT_FOUND', 'Category not found in this household', 404);
  }
}

/**
 * Check if mapping already exists
 */
async function checkMappingExists(productId: string, categoryId: string): Promise<boolean> {
  const existing = await prisma.productIngredientCategory.findUnique({
    where: {
      productId_ingredientCategoryId: {
        productId,
        ingredientCategoryId: categoryId,
      },
    },
  });

  return !!existing;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all categories assigned to a product
 */
export async function getProductCategories(
  productId: string,
  householdId: string
): Promise<CategoryMapping[]> {
  await validateProductOwnership(productId, householdId);

  const mappings = await prisma.productIngredientCategory.findMany({
    where: { productId },
    include: {
      ingredientCategory: {
        include: {
          baseUnit: true,
        },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { ingredientCategory: { name: 'asc' } },
    ],
  });

  return mappings.map((mapping) => ({
    categoryId: mapping.ingredientCategoryId,
    categoryName: mapping.ingredientCategory.name,
    baseUnitId: mapping.ingredientCategory.baseUnitId,
    baseUnitName: mapping.ingredientCategory.baseUnit.name,
    baseUnitAbbreviation: mapping.ingredientCategory.baseUnit.abbreviation,
    priority: mapping.priority ?? 1,
    createdAt: mapping.ingredientCategory.createdAt,
  }));
}

/**
 * Assign a product to a category
 * Default priority is 1 (highest priority)
 */
export async function assignProductToCategory(
  productId: string,
  categoryId: string,
  householdId: string,
  priority: number = 1
): Promise<{ productId: string; categoryId: string; priority: number }> {
  // Validate ownership
  await validateProductOwnership(productId, householdId);
  await validateCategoryOwnership(categoryId, householdId);

  // Check for existing mapping
  const exists = await checkMappingExists(productId, categoryId);
  if (exists) {
    throw createError(
      'MAPPING_ALREADY_EXISTS',
      'Product is already assigned to this category',
      409
    );
  }

  // Validate priority
  if (priority < 0 || !Number.isInteger(priority)) {
    throw createError(
      'INVALID_PRIORITY',
      'Priority must be a non-negative integer',
      400
    );
  }

  // Create mapping
  const mapping = await prisma.productIngredientCategory.create({
    data: {
      productId,
      ingredientCategoryId: categoryId,
      priority,
    },
  });

  return {
    productId: mapping.productId,
    categoryId: mapping.ingredientCategoryId,
    priority: mapping.priority ?? 1,
  };
}

/**
 * Remove a product from a category
 */
export async function removeProductFromCategory(
  productId: string,
  categoryId: string,
  householdId: string
): Promise<void> {
  // Validate ownership
  await validateProductOwnership(productId, householdId);
  await validateCategoryOwnership(categoryId, householdId);

  // Check if mapping exists
  const mapping = await prisma.productIngredientCategory.findUnique({
    where: {
      productId_ingredientCategoryId: {
        productId,
        ingredientCategoryId: categoryId,
      },
    },
  });

  if (!mapping) {
    throw createError(
      'MAPPING_NOT_FOUND',
      'Product is not assigned to this category',
      404
    );
  }

  // Delete mapping
  await prisma.productIngredientCategory.delete({
    where: {
      productId_ingredientCategoryId: {
        productId,
        ingredientCategoryId: categoryId,
      },
    },
  });
}

/**
 * Update the priority of a product in a category
 */
export async function updateCategoryPriority(
  productId: string,
  categoryId: string,
  householdId: string,
  priority: number
): Promise<{ productId: string; categoryId: string; priority: number }> {
  // Validate ownership
  await validateProductOwnership(productId, householdId);
  await validateCategoryOwnership(categoryId, householdId);

  // Validate priority
  if (priority < 0 || !Number.isInteger(priority)) {
    throw createError(
      'INVALID_PRIORITY',
      'Priority must be a non-negative integer',
      400
    );
  }

  // Check if mapping exists
  const existing = await prisma.productIngredientCategory.findUnique({
    where: {
      productId_ingredientCategoryId: {
        productId,
        ingredientCategoryId: categoryId,
      },
    },
  });

  if (!existing) {
    throw createError(
      'MAPPING_NOT_FOUND',
      'Product is not assigned to this category',
      404
    );
  }

  // Update priority
  const mapping = await prisma.productIngredientCategory.update({
    where: {
      productId_ingredientCategoryId: {
        productId,
        ingredientCategoryId: categoryId,
      },
    },
    data: { priority },
  });

  return {
    productId: mapping.productId,
    categoryId: mapping.ingredientCategoryId,
    priority: mapping.priority ?? 1,
  };
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all products in a category, sorted by priority
 * Includes current stock for cooking preparation
 */
export async function getProductsByCategory(
  categoryId: string,
  householdId: string
): Promise<ProductInCategory[]> {
  await validateCategoryOwnership(categoryId, householdId);

  const mappings = await prisma.productIngredientCategory.findMany({
    where: { ingredientCategoryId: categoryId },
    include: {
      product: {
        include: {
          stockUnit: true,
          currentStock: true,
        },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { product: { name: 'asc' } },
    ],
  });

  return mappings.map((mapping) => ({
    id: mapping.product.id,
    name: mapping.product.name,
    description: mapping.product.description,
    imageUrl: mapping.product.imageUrl,
    priority: mapping.priority ?? 1,
    currentStock: mapping.product.currentStock?.quantity ?? 0,
    stockUnitId: mapping.product.stockUnitId,
    stockUnitName: mapping.product.stockUnit.name,
  }));
}

/**
 * Get the preferred product in a category with available stock
 * Uses priority + FEFO logic:
 * 1. Filter products with stock > 0
 * 2. Sort by priority (ascending - lower number = higher priority)
 * 3. Return first match or null
 * 
 * This is preparation for Step 4 (Category Resolution Logic)
 */
export async function getPreferredProductWithStock(
  categoryId: string,
  householdId: string
): Promise<ProductInCategory | null> {
  const products = await getProductsByCategory(categoryId, householdId);

  // Filter for products with stock and return first (already sorted by priority)
  const availableProduct = products.find((p) => p.currentStock > 0);

  return availableProduct || null;
}

/**
 * Get all categories with their products and mappings
 * Optimized single query for UI bulk load
 * Used in Settings page for mapping management
 */
export async function getAllCategoriesWithMappings(
  householdId: string
): Promise<CategoryWithProducts[]> {
  const categories = await prisma.ingredientCategory.findMany({
    where: { householdId },
    include: {
      baseUnit: true,
      products: {
        include: {
          product: {
            include: {
              stockUnit: true,
              currentStock: true,
            },
          },
        },
        orderBy: [
          { priority: 'asc' },
          { product: { name: 'asc' } },
        ],
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    baseUnit: {
      id: category.baseUnit.id,
      name: category.baseUnit.name,
      abbreviation: category.baseUnit.abbreviation,
    },
    products: category.products.map((mapping) => ({
      id: mapping.product.id,
      name: mapping.product.name,
      description: mapping.product.description,
      imageUrl: mapping.product.imageUrl,
      priority: mapping.priority ?? 1,
      currentStock: mapping.product.currentStock?.quantity ?? 0,
      stockUnitId: mapping.product.stockUnitId,
      stockUnitName: mapping.product.stockUnit.name,
    })),
  }));
}

/**
 * Resolves category-based ingredient to available products using FEFO + Priority
 * 
 * Algorithm:
 * 1. Get all products in category (sorted by user priority)
 * 2. For each product, get all lots with stock > 0
 * 3. Sort lots by FEFO (bestBeforeDate ASC, purchasedAt ASC)
 * 4. Sum remainingQuantity per product
 * 5. Return total available + suggested products sorted by priority + stock
 * 
 * @param ingredientCategoryId - Category to resolve
 * @param householdId - Household context
 * @returns Available stock and suggested products
 */
export async function resolveCategoryStock(
  ingredientCategoryId: string,
  householdId: string
): Promise<{
  totalAvailable: number;
  suggestedProducts: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    priority: number;
    availableQuantity: number;
    stockUnitName: string;
    suggestedQuantity: number;
  }>;
}> {
  await validateCategoryOwnership(ingredientCategoryId, householdId);

  // 1. Get products in category with priority
  const mappings = await prisma.productIngredientCategory.findMany({
    where: { ingredientCategoryId },
    include: {
      product: {
        include: {
          stockUnit: true,
          // Get lots with balance > 0, sorted by FEFO
          stockLots: {
            include: {
              balance: true,
            },
            where: {
              balance: {
                remainingQuantity: {
                  gt: 0,
                },
              },
            },
            orderBy: [
              { bestBeforeDate: 'asc' },  // FEFO: expiring first
              { purchasedAt: 'asc' },       // FEFO: oldest first
            ],
          },
        },
      },
    },
    orderBy: [
      { priority: 'asc' },  // User priority preference
      { product: { name: 'asc' } },
    ],
  });

  // 2. Calculate available stock per product
  const productsWithStock = mappings
    .map((mapping) => ({
      productId: mapping.product.id,
      productName: mapping.product.name,
      productImage: mapping.product.imageUrl,
      priority: mapping.priority ?? 1,
      stockUnitName: mapping.product.stockUnit.name,
      availableQuantity: mapping.product.stockLots.reduce(
        (sum, lot) => sum + (lot.balance?.remainingQuantity || 0),
        0
      ),
      suggestedQuantity: 0, // Will be calculated in Step 5
    }))
    .filter((p) => p.availableQuantity > 0);

  // 3. Sort by: priority (ASC) then available (DESC)
  productsWithStock.sort((a, b) => {
    // Lower priority number = higher priority (user preference)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // More stock = higher suggestion rank
    return b.availableQuantity - a.availableQuantity;
  });

  // 4. Calculate total available
  const totalAvailable = productsWithStock.reduce(
    (sum, p) => sum + p.availableQuantity,
    0
  );

  return {
    totalAvailable,
    suggestedProducts: productsWithStock,
  };
}

/**
 * Get a single category with its products
 */
export async function getCategoryWithProducts(
  categoryId: string,
  householdId: string
): Promise<CategoryWithProducts> {
  await validateCategoryOwnership(categoryId, householdId);

  const category = await prisma.ingredientCategory.findUnique({
    where: { id: categoryId },
    include: {
      baseUnit: true,
      products: {
        include: {
          product: {
            include: {
              stockUnit: true,
              currentStock: true,
            },
          },
        },
        orderBy: [
          { priority: 'asc' },
          { product: { name: 'asc' } },
        ],
      },
    },
  });

  if (!category) {
    throw createError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  }

  return {
    id: category.id,
    name: category.name,
    baseUnit: {
      id: category.baseUnit.id,
      name: category.baseUnit.name,
      abbreviation: category.baseUnit.abbreviation,
    },
    products: category.products.map((mapping) => ({
      id: mapping.product.id,
      name: mapping.product.name,
      description: mapping.product.description,
      imageUrl: mapping.product.imageUrl,
      priority: mapping.priority ?? 1,
      currentStock: mapping.product.currentStock?.quantity ?? 0,
      stockUnitId: mapping.product.stockUnitId,
      stockUnitName: mapping.product.stockUnit.name,
    })),
  };
}
