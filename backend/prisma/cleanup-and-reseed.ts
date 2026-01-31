/**
 * Cleanup and Reseed Script for BetterGrocy
 * 
 * Usage: npx ts-node prisma/cleanup-and-reseed.ts <household-id>
 * 
 * This script:
 * 1. Deletes all demo data (categories, products, recipes) for a household
 * 2. Re-runs the household seed to recreate fresh demo data
 * 
 * Use this to test the seed functionality without creating a new user.
 */

import prisma from '../src/lib/prisma';
import { seedHouseholdData } from '../src/services/seedService';

async function cleanupAndReseed(householdId: string) {
  console.log(`🧹 Cleaning up household ${householdId}...\n`);

  // Step 1: Delete recipes and their ingredients
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    select: { id: true, name: true },
  });

  for (const recipe of recipes) {
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: recipe.id },
    });
    await prisma.recipe.delete({
      where: { id: recipe.id },
    });
    console.log(`  🗑️ Deleted recipe: ${recipe.name}`);
  }

  // Step 2: Delete products and their category mappings
  const products = await prisma.product.findMany({
    where: { householdId },
    select: { id: true, name: true },
  });

  for (const product of products) {
    await prisma.productIngredientCategory.deleteMany({
      where: { productId: product.id },
    });
    await prisma.product.delete({
      where: { id: product.id },
    });
    console.log(`  🗑️ Deleted product: ${product.name}`);
  }

  // Step 3: Delete ingredient categories
  const categories = await prisma.ingredientCategory.findMany({
    where: { householdId },
    select: { id: true, name: true },
  });

  for (const category of categories) {
    await prisma.ingredientCategory.delete({
      where: { id: category.id },
    });
    console.log(`  🗑️ Deleted category: ${category.name}`);
  }

  console.log(`\n✅ Cleanup completed`);
  console.log(`  - Deleted ${recipes.length} recipes`);
  console.log(`  - Deleted ${products.length} products`);
  console.log(`  - Deleted ${categories.length} categories\n`);

  // Step 4: Re-seed
  console.log(`🌹 Re-seeding household...\n`);
  await seedHouseholdData(householdId);

  console.log('\n🎉 Cleanup and reseed completed successfully!');
}

// Get household ID from command line
const householdId = process.argv[2];

if (!householdId) {
  console.error('❌ Error: Please provide a household ID');
  console.log('\nUsage: npx ts-node prisma/cleanup-and-reseed.ts <household-id>');
  console.log('\nTo find your household ID:');
  console.log('  1. Check the response from /api/auth/login or /api/auth/register');
  console.log('  2. Or check the browser dev tools Network tab');
  process.exit(1);
}

cleanupAndReseed(householdId)
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
