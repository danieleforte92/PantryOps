/**
 * Seed Service for BetterGrocy
 * 
 * Handles all database seeding operations:
 * - Global seed: Units (runs at backend startup)
 * - Household seed: Categories, demo products, demo recipes (runs on household creation)
 * 
 * All operations are idempotent - safe to run multiple times without duplicates.
 */

import prisma from '../lib/prisma';
import {
  DEFAULT_UNITS,
  DEFAULT_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_RECIPES,
} from './seedData';

/**
 * Seeds global data (units) into the database.
 * Runs automatically when the backend server starts.
 * Idempotent: skips if units already exist.
 */
export async function seedGlobalData(): Promise<void> {
  console.log('🌱 Checking global seed data...');

  const existingCount = await prisma.unit.count();
  if (existingCount > 0) {
    console.log(`  ⏭️ ${existingCount} units already exist, skipping`);
    return;
  }

  console.log('  📦 Creating default units...');

  await Promise.all(
    DEFAULT_UNITS.map((unit) =>
      prisma.unit.create({
        data: {
          name: unit.name,
          abbreviation: unit.abbreviation,
        },
      })
    )
  );

  console.log(`  ✅ Created ${DEFAULT_UNITS.length} units`);
  console.log('🎉 Global seed completed');
}

/**
 * Seeds household-specific data when a new household is created.
 * Includes: ingredient categories, demo products (with category mappings), demo recipes.
 * Only runs in non-production environments.
 * Idempotent: skips if categories already exist for this household.
 * 
 * @param householdId - The ID of the household to seed
 */
export async function seedHouseholdData(householdId: string): Promise<void> {
  console.log(`🌱 Seeding household data for ${householdId}...`);

  // Check if already seeded
  const isSeeded = await isHouseholdSeeded(householdId);
  if (isSeeded) {
    console.log(`  ⏭️ Household ${householdId} already seeded, skipping`);
    return;
  }

  try {
    console.log('  [1/3] Creating ingredient categories...');
    const categories = await seedCategories(householdId);

    console.log('  [2/3] Creating demo products...');
    await seedDemoProducts(householdId, categories);

    console.log('  [3/3] Creating demo recipes...');
    await seedDemoRecipes(householdId, categories);

    console.log('🎉 Household seed completed successfully');
  } catch (error) {
    console.error('❌ Household seed failed:', error);
    throw error;
  }
}

/**
 * Checks if a household has already been seeded.
 * Uses ingredient categories as the marker (if any exist, household is considered seeded).
 */
async function isHouseholdSeeded(householdId: string): Promise<boolean> {
  const count = await prisma.ingredientCategory.count({
    where: { householdId },
  });
  return count > 0;
}

/**
 * Creates ingredient categories for a household.
 * Returns a map of category name -> category ID for later use.
 */
async function seedCategories(
  householdId: string
): Promise<Map<string, string>> {
  console.log('  📦 Creating ingredient categories...');

  const categoryMap = new Map<string, string>();

  // Get all units first
  const units = await prisma.unit.findMany();
  const unitMap = new Map(units.map((u) => [u.name, u.id]));

  for (const cat of DEFAULT_CATEGORIES) {
    const unitId = unitMap.get(cat.baseUnitName);
    if (!unitId) {
      console.warn(`    ⚠️ Unit not found: ${cat.baseUnitName}, skipping category ${cat.name}`);
      continue;
    }

    // Check if category already exists (idempotency)
    const existing = await prisma.ingredientCategory.findUnique({
      where: {
        householdId_name: {
          householdId,
          name: cat.name,
        },
      },
    });

    if (existing) {
      categoryMap.set(cat.name, existing.id);
      console.log(`    ⏭️ ${cat.name} already exists`);
    } else {
      const created = await prisma.ingredientCategory.create({
        data: {
          householdId,
          name: cat.name,
          baseUnitId: unitId,
        },
      });
      categoryMap.set(cat.name, created.id);
      console.log(`    ✅ Created category: ${cat.name}`);
    }
  }

  console.log(`  ✅ Categories created: ${categoryMap.size}`);
  return categoryMap;
}

/**
 * Creates demo products for a household and maps them to ingredient categories.
 * Products are created without stock - user must add stock manually.
 */
async function seedDemoProducts(
  householdId: string,
  categoryMap: Map<string, string>
): Promise<void> {
  console.log('  📦 Creating demo products...');

  for (const prod of DEMO_PRODUCTS) {
    const categoryId = categoryMap.get(prod.categoryName);
    if (!categoryId) {
      console.warn(`    ⚠️ Category not found: ${prod.categoryName}, skipping product ${prod.name}`);
      continue;
    }

    // Check if product already exists for this household (by name)
    const existing = await prisma.product.findFirst({
      where: {
        householdId,
        name: prod.name,
      },
    });

    if (existing) {
      console.log(`    ⏭️ ${prod.name} already exists`);
      
      // Ensure category mapping exists
      const existingMapping = await prisma.productIngredientCategory.findFirst({
        where: {
          productId: existing.id,
          ingredientCategoryId: categoryId,
        },
      });

      if (!existingMapping) {
        await prisma.productIngredientCategory.create({
          data: {
            productId: existing.id,
            ingredientCategoryId: categoryId,
            priority: 1,
          },
        });
        console.log(`    🔗 Linked to category: ${prod.categoryName}`);
      }
      continue;
    }

    // Create product with category mapping in a transaction
    const created = await prisma.$transaction(async (tx) => {
      const unitId = (await tx.ingredientCategory.findUnique({
        where: { id: categoryId },
        select: { baseUnitId: true },
      }))?.baseUnitId || (await tx.unit.findFirst({ select: { id: true } }))!.id;

      const product = await tx.product.create({
        data: {
          householdId,
          name: prod.name,
          stockUnitId: unitId,
          purchaseUnitId: unitId,
        },
      });

      // Create barcode if provided (skip if duplicate)
      if (prod.barcode) {
        const existingBarcode = await tx.barcode.findUnique({
          where: { code: prod.barcode },
        });
        
        if (!existingBarcode) {
          await tx.barcode.create({
            data: {
              code: prod.barcode,
              productId: product.id,
            },
          });
          console.log(`    ✅ Created barcode: ${prod.barcode}`);
        } else {
          console.log(`    ⏭️ Barcode ${prod.barcode} already exists, skipping`);
        }
      }

      // Create category mapping
      await tx.productIngredientCategory.create({
        data: {
          productId: product.id,
          ingredientCategoryId: categoryId,
          priority: 1,
        },
      });

      return product;
    });

    console.log(`    ✅ Created product: ${prod.name} (mapped to ${prod.categoryName})`);
  }

  console.log(`  ✅ Demo products created`);
}

/**
 * Creates demo recipes for a household.
 * Recipes use ingredient categories (not specific products).
 * These serve as examples of the app's suggestion features.
 */
async function seedDemoRecipes(
  householdId: string,
  categoryMap: Map<string, string>
): Promise<void> {
  console.log('  📦 Creating demo recipes...');

  for (const recipe of DEMO_RECIPES) {
    // Check if recipe already exists for this household (by name)
    const existing = await prisma.recipe.findFirst({
      where: {
        householdId,
        name: recipe.name,
      },
    });

    if (existing) {
      console.log(`    ⏭️ ${recipe.name} already exists`);
      continue;
    }

    // Validate all ingredients have valid categories
    const validIngredients: { ingredientCategoryId: string; quantity: number; unitId: string }[] = [];
    for (const ing of recipe.ingredients) {
      const categoryId = categoryMap.get(ing.categoryName);
      if (!categoryId) {
        console.warn(`    ⚠️ Category not found: ${ing.categoryName}, skipping ingredient`);
        continue;
      }

      const category = await prisma.ingredientCategory.findUnique({
        where: { id: categoryId },
        select: { baseUnitId: true },
      });

      if (!category) continue;

      validIngredients.push({
        ingredientCategoryId: categoryId,
        quantity: ing.quantity,
        unitId: category.baseUnitId,
      });
    }

    if (validIngredients.length === 0) {
      console.warn(`    ⚠️ No valid ingredients for ${recipe.name}, skipping`);
      continue;
    }

    // Create recipe with ingredients
    await prisma.$transaction(async (tx) => {
      const createdRecipe = await tx.recipe.create({
        data: {
          householdId,
          name: recipe.name,
          servings: recipe.servings,
        },
      });

      await tx.recipeIngredient.createMany({
        data: validIngredients.map((ing) => ({
          recipeId: createdRecipe.id,
          ingredientCategoryId: ing.ingredientCategoryId,
          quantity: ing.quantity,
          unitId: ing.unitId,
        })),
      });

      return createdRecipe;
    });

    console.log(`    ✅ Created recipe: ${recipe.name} (${validIngredients.length} ingredients)`);
  }

  console.log(`  ✅ Demo recipes created`);
}
