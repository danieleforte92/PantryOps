import { seedGlobalData, seedHouseholdData } from '../src/services/seedService';
import prisma from '../src/lib/prisma';

/**
 * Prisma seed script - Entry point for `npx prisma db seed`
 * 
 * Seeds global data (units) only.
 * Household-specific data is seeded automatically when households are created.
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Seed global data (units)
    await seedGlobalData();

    console.log('\n🎉 Database seed completed successfully!');
    console.log('\n📌 Note: Household-specific data (categories, demo products, recipes)');
    console.log('   is seeded automatically when new households are created.');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Unexpected error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
