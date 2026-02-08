import bcrypt from 'bcrypt';
import prisma from '../src/lib/prisma';
import { seedGlobalData, seedHouseholdData } from '../src/services/seedService';
import { updateProjections } from '../src/services/projections';

type SeedSize = 'compact' | 'medium' | 'large';

interface CliOptions {
  size: SeedSize;
  householdName: string;
  email: string;
  password: string;
}

interface ProductMappingPlan {
  categoryName: string;
  priority: number;
}

interface StockLotPlan {
  quantity: number;
  bestBeforeOffsetDays: number | null;
  locationName: string;
  markOpened?: boolean;
}

interface ProductPlan {
  name: string;
  description?: string;
  stockUnitAbbreviation?: string;
  purchaseUnitAbbreviation?: string;
  purchaseToStockFactor?: number;
  minStockAmount?: number;
  defaultLocationName?: string;
  shelfLifeDays?: number;
  mappings?: ProductMappingPlan[];
  lots: StockLotPlan[];
  shopping?: {
    quantity: number;
    purchased: boolean;
    isSuggested: boolean;
  };
}

interface RecipePlan {
  name: string;
  description: string;
  servings: number;
  ingredients: Array<{
    categoryName: string;
    quantity: number;
  }>;
}

const DEFAULT_OPTIONS: CliOptions = {
  size: 'medium',
  householdName: 'PantryOps Demo Screenshots',
  email: 'demo.screenshots@pantryops.local',
  password: 'DemoScreenshots123!',
};

const DEFAULT_LOCATIONS = [
  { name: 'Frigorifero', isFreezer: false },
  { name: 'Freezer', isFreezer: true },
  { name: 'Dispensa', isFreezer: false },
  { name: 'Cantina', isFreezer: false },
];

const PRODUCT_PLANS: ProductPlan[] = [
  {
    name: 'Barilla Spaghetti n.5',
    description: 'Pasta lunga di grano duro',
    minStockAmount: 600,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pasta secca', priority: 1 }],
    lots: [{ quantity: 950, bestBeforeOffsetDays: 240, locationName: 'Dispensa' }],
  },
  {
    name: 'Penne Rigate Integrali',
    minStockAmount: 500,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pasta secca', priority: 2 }],
    lots: [{ quantity: 650, bestBeforeOffsetDays: 180, locationName: 'Dispensa' }],
  },
  {
    name: 'Fusilli Trafilati al Bronzo',
    minStockAmount: 500,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pasta secca', priority: 3 }],
    lots: [{ quantity: 420, bestBeforeOffsetDays: 120, locationName: 'Dispensa' }],
  },
  {
    name: 'Linguine',
    minStockAmount: 400,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pasta secca', priority: 4 }],
    lots: [{ quantity: 300, bestBeforeOffsetDays: 40, locationName: 'Dispensa' }],
  },
  {
    name: 'Riso Arborio Scotti',
    minStockAmount: 600,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Riso', priority: 1 }],
    lots: [{ quantity: 750, bestBeforeOffsetDays: 300, locationName: 'Dispensa' }],
  },
  {
    name: 'Riso Basmati',
    minStockAmount: 700,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Riso', priority: 2 }],
    lots: [{ quantity: 250, bestBeforeOffsetDays: 90, locationName: 'Dispensa' }],
  },
  {
    name: 'Riso Integrale',
    minStockAmount: 450,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Riso', priority: 3 }],
    lots: [{ quantity: 320, bestBeforeOffsetDays: 150, locationName: 'Dispensa' }],
  },
  {
    name: 'Zucchine',
    minStockAmount: 350,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 7,
    mappings: [{ categoryName: 'Verdure fresche', priority: 1 }],
    lots: [{ quantity: 220, bestBeforeOffsetDays: 3, locationName: 'Frigorifero' }],
  },
  {
    name: 'Carote',
    minStockAmount: 300,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 15,
    mappings: [{ categoryName: 'Verdure fresche', priority: 2 }],
    lots: [{ quantity: 380, bestBeforeOffsetDays: 12, locationName: 'Frigorifero' }],
  },
  {
    name: 'Spinaci Freschi',
    minStockAmount: 220,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 4,
    mappings: [{ categoryName: 'Verdure fresche', priority: 3 }],
    lots: [{ quantity: 130, bestBeforeOffsetDays: -1, locationName: 'Frigorifero', markOpened: true }],
  },
  {
    name: 'Pomodori Pelati Mutti',
    minStockAmount: 500,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pomodori (conserva)', priority: 1 }],
    lots: [{ quantity: 520, bestBeforeOffsetDays: 260, locationName: 'Dispensa' }],
  },
  {
    name: 'Passata Rustica',
    minStockAmount: 600,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pomodori (conserva)', priority: 2 }],
    lots: [{ quantity: 240, bestBeforeOffsetDays: 25, locationName: 'Dispensa' }],
  },
  {
    name: 'Datterini in Scatola',
    minStockAmount: 400,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Pomodori (conserva)', priority: 3 }],
    lots: [{ quantity: 340, bestBeforeOffsetDays: 90, locationName: 'Dispensa' }],
  },
  {
    name: 'Olio Extravergine Bertolli',
    minStockAmount: 400,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Olio vegetale', priority: 1 }],
    lots: [{ quantity: 700, bestBeforeOffsetDays: 200, locationName: 'Dispensa' }],
  },
  {
    name: 'Olio di Semi di Girasole',
    minStockAmount: 300,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Olio vegetale', priority: 2 }],
    lots: [{ quantity: 250, bestBeforeOffsetDays: 45, locationName: 'Dispensa' }],
  },
  {
    name: 'Olio EVO Toscano',
    minStockAmount: 300,
    defaultLocationName: 'Dispensa',
    mappings: [{ categoryName: 'Olio vegetale', priority: 3 }],
    lots: [{ quantity: 180, bestBeforeOffsetDays: 15, locationName: 'Dispensa' }],
  },
  {
    name: 'Parmigiano Reggiano',
    minStockAmount: 250,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 45,
    mappings: [{ categoryName: 'Formaggio', priority: 1 }],
    lots: [{ quantity: 90, bestBeforeOffsetDays: 6, locationName: 'Frigorifero', markOpened: true }],
  },
  {
    name: 'Grana Padano',
    minStockAmount: 220,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 45,
    mappings: [{ categoryName: 'Formaggio', priority: 2 }],
    lots: [{ quantity: 210, bestBeforeOffsetDays: 21, locationName: 'Frigorifero' }],
  },
  {
    name: 'Pecorino Romano',
    minStockAmount: 180,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 35,
    mappings: [{ categoryName: 'Formaggio', priority: 3 }],
    lots: [{ quantity: 120, bestBeforeOffsetDays: 12, locationName: 'Frigorifero' }],
  },
  {
    name: 'Petto di Pollo',
    minStockAmount: 600,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 2,
    mappings: [{ categoryName: 'Carne', priority: 1 }],
    lots: [{ quantity: 260, bestBeforeOffsetDays: 0, locationName: 'Frigorifero' }],
  },
  {
    name: 'Macinato di Manzo',
    minStockAmount: 500,
    defaultLocationName: 'Freezer',
    shelfLifeDays: 3,
    mappings: [{ categoryName: 'Carne', priority: 2 }],
    lots: [{ quantity: 480, bestBeforeOffsetDays: 60, locationName: 'Freezer' }],
  },
  {
    name: 'Fesa di Tacchino',
    minStockAmount: 400,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 2,
    mappings: [{ categoryName: 'Carne', priority: 3 }],
    lots: [{ quantity: 190, bestBeforeOffsetDays: 1, locationName: 'Frigorifero' }],
  },
  {
    name: 'Uova Fresche',
    stockUnitAbbreviation: 'pz',
    purchaseUnitAbbreviation: 'pz',
    minStockAmount: 12,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 25,
    lots: [{ quantity: 6, bestBeforeOffsetDays: 8, locationName: 'Frigorifero' }],
    shopping: { quantity: 1, purchased: false, isSuggested: false },
  },
  {
    name: 'Latte Intero',
    stockUnitAbbreviation: 'conf',
    purchaseUnitAbbreviation: 'conf',
    minStockAmount: 4,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 6,
    lots: [{ quantity: 1, bestBeforeOffsetDays: 1, locationName: 'Frigorifero' }],
    shopping: { quantity: 2, purchased: false, isSuggested: true },
  },
  {
    name: 'Pane Casereccio',
    stockUnitAbbreviation: 'pz',
    purchaseUnitAbbreviation: 'pz',
    minStockAmount: 2,
    defaultLocationName: 'Dispensa',
    shelfLifeDays: 3,
    lots: [{ quantity: 1, bestBeforeOffsetDays: 0, locationName: 'Dispensa' }],
    shopping: { quantity: 1, purchased: true, isSuggested: false },
  },
  {
    name: 'Yogurt Greco',
    stockUnitAbbreviation: 'conf',
    purchaseUnitAbbreviation: 'conf',
    minStockAmount: 3,
    defaultLocationName: 'Frigorifero',
    shelfLifeDays: 10,
    lots: [{ quantity: 2, bestBeforeOffsetDays: 2, locationName: 'Frigorifero' }],
    shopping: { quantity: 2, purchased: false, isSuggested: false },
  },
  {
    name: 'Tonno in Scatola',
    stockUnitAbbreviation: 'conf',
    purchaseUnitAbbreviation: 'conf',
    minStockAmount: 5,
    defaultLocationName: 'Dispensa',
    shelfLifeDays: 365,
    lots: [{ quantity: 4, bestBeforeOffsetDays: 210, locationName: 'Dispensa' }],
    shopping: { quantity: 3, purchased: true, isSuggested: true },
  },
  {
    name: 'Ceci in Lattina',
    stockUnitAbbreviation: 'conf',
    purchaseUnitAbbreviation: 'conf',
    minStockAmount: 4,
    defaultLocationName: 'Dispensa',
    shelfLifeDays: 365,
    lots: [{ quantity: 2, bestBeforeOffsetDays: 160, locationName: 'Dispensa' }],
    shopping: { quantity: 2, purchased: false, isSuggested: true },
  },
  {
    name: 'Farina 00',
    minStockAmount: 1000,
    defaultLocationName: 'Dispensa',
    lots: [{ quantity: 800, bestBeforeOffsetDays: 280, locationName: 'Dispensa' }],
    shopping: { quantity: 1, purchased: false, isSuggested: false },
  },
  {
    name: 'Acqua Naturale 1.5L',
    stockUnitAbbreviation: 'bot',
    purchaseUnitAbbreviation: 'bot',
    minStockAmount: 6,
    defaultLocationName: 'Cantina',
    lots: [{ quantity: 8, bestBeforeOffsetDays: 350, locationName: 'Cantina' }],
  },
];

const RECIPE_PLANS: RecipePlan[] = [
  {
    name: 'Pasta al pomodoro',
    description: 'Classico veloce con conserva e olio.',
    servings: 2,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 180 },
      { categoryName: 'Pomodori (conserva)', quantity: 220 },
      { categoryName: 'Olio vegetale', quantity: 25 },
    ],
  },
  {
    name: 'Risotto semplice',
    description: 'Risotto base mantecato con formaggio.',
    servings: 2,
    ingredients: [
      { categoryName: 'Riso', quantity: 170 },
      { categoryName: 'Formaggio', quantity: 45 },
      { categoryName: 'Olio vegetale', quantity: 20 },
    ],
  },
  {
    name: 'Pasta zucchine e pollo',
    description: 'Piatto unico bilanciato e rapido.',
    servings: 3,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 240 },
      { categoryName: 'Verdure fresche', quantity: 220 },
      { categoryName: 'Carne', quantity: 280 },
      { categoryName: 'Olio vegetale', quantity: 30 },
    ],
  },
  {
    name: 'Riso con verdure',
    description: 'Riso saltato con verdure di stagione.',
    servings: 2,
    ingredients: [
      { categoryName: 'Riso', quantity: 180 },
      { categoryName: 'Verdure fresche', quantity: 200 },
      { categoryName: 'Olio vegetale', quantity: 25 },
    ],
  },
  {
    name: 'Pollo al pomodoro',
    description: 'Carne in umido con conserva di pomodoro.',
    servings: 2,
    ingredients: [
      { categoryName: 'Carne', quantity: 320 },
      { categoryName: 'Pomodori (conserva)', quantity: 240 },
      { categoryName: 'Olio vegetale', quantity: 30 },
    ],
  },
  {
    name: 'Pasta quattro formaggi',
    description: 'Versione cremosa con mix di formaggi.',
    servings: 2,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 200 },
      { categoryName: 'Formaggio', quantity: 110 },
      { categoryName: 'Olio vegetale', quantity: 15 },
    ],
  },
  {
    name: 'Riso con carne e verdure',
    description: 'Piatto unico per pranzi veloci.',
    servings: 3,
    ingredients: [
      { categoryName: 'Riso', quantity: 260 },
      { categoryName: 'Carne', quantity: 260 },
      { categoryName: 'Verdure fresche', quantity: 200 },
      { categoryName: 'Olio vegetale', quantity: 25 },
    ],
  },
  {
    name: 'Vellutata rustica',
    description: 'Verdure e formaggio per una cena leggera.',
    servings: 2,
    ingredients: [
      { categoryName: 'Verdure fresche', quantity: 320 },
      { categoryName: 'Formaggio', quantity: 40 },
      { categoryName: 'Olio vegetale', quantity: 15 },
    ],
  },
  {
    name: 'Pasta al ragu rapido',
    description: 'Sughetto espresso con carne e conserva.',
    servings: 3,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 260 },
      { categoryName: 'Carne', quantity: 230 },
      { categoryName: 'Pomodori (conserva)', quantity: 280 },
      { categoryName: 'Olio vegetale', quantity: 30 },
    ],
  },
  {
    name: 'Riso al pomodoro',
    description: 'Alternativa semplice alla pasta al sugo.',
    servings: 2,
    ingredients: [
      { categoryName: 'Riso', quantity: 180 },
      { categoryName: 'Pomodori (conserva)', quantity: 210 },
      { categoryName: 'Olio vegetale', quantity: 20 },
    ],
  },
  {
    name: 'Insalata tiepida di pollo',
    description: 'Carne e verdure con condimento leggero.',
    servings: 2,
    ingredients: [
      { categoryName: 'Carne', quantity: 280 },
      { categoryName: 'Verdure fresche', quantity: 240 },
      { categoryName: 'Olio vegetale', quantity: 20 },
    ],
  },
  {
    name: 'Pasta cremosa al formaggio',
    description: 'Porzione abbondante pronta in 15 minuti.',
    servings: 2,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 220 },
      { categoryName: 'Formaggio', quantity: 75 },
      { categoryName: 'Olio vegetale', quantity: 20 },
    ],
  },
];

function parseArgs(rawArgs: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_OPTIONS };

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    if (!value) continue;

    if (key === 'size' && (value === 'compact' || value === 'medium' || value === 'large')) {
      options.size = value;
    }
    if (key === 'household-name') options.householdName = value;
    if (key === 'email') options.email = value;
    if (key === 'password') options.password = value;
  }

  return options;
}

function trimBySize<T>(size: SeedSize, list: T[]): T[] {
  if (size === 'compact') return list.slice(0, Math.min(list.length, 14));
  if (size === 'medium') return list.slice(0, Math.min(list.length, 24));
  return list;
}

function getBestBeforeDate(offsetDays: number | null): Date | null {
  if (offsetDays === null) return null;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

async function ensureLocations(householdId: string): Promise<Map<string, string>> {
  const existing = await prisma.location.findMany({
    where: { householdId },
    select: { id: true, name: true, isFreezer: true },
  });

  const byName = new Map(existing.map((loc) => [loc.name, loc.id]));
  for (const location of DEFAULT_LOCATIONS) {
    if (!byName.has(location.name)) {
      const created = await prisma.location.create({
        data: {
          householdId,
          name: location.name,
          isFreezer: location.isFreezer,
        },
      });
      byName.set(created.name, created.id);
    }
  }

  return byName;
}

async function ensureDemoUserAndHousehold(options: CliOptions): Promise<{ userId: string; householdId: string }> {
  const existingUser = await prisma.user.findUnique({
    where: { email: options.email },
    include: {
      households: {
        include: { household: true },
      },
    },
  });

  let userId: string;
  let householdId: string | null = null;

  if (existingUser) {
    userId = existingUser.id;
    const attached = existingUser.households.find((entry) => entry.household.name === options.householdName);
    householdId = attached?.householdId ?? null;
  } else {
    const passwordHash = await bcrypt.hash(options.password, 10);
    const user = await prisma.user.create({
      data: {
        email: options.email,
        passwordHash,
        name: 'Screenshot Demo',
      },
    });
    userId = user.id;
  }

  if (!householdId) {
    const household = await prisma.household.create({
      data: { name: options.householdName },
    });
    householdId = household.id;

    await prisma.householdUser.create({
      data: {
        householdId,
        userId,
        role: 'ADMIN',
      },
    });
  }

  await ensureLocations(householdId);
  return { userId, householdId };
}

async function createPurchaseLot(
  householdId: string,
  userId: string,
  productId: string,
  locationId: string,
  quantity: number,
  bestBeforeDate: Date | null,
  markOpened: boolean
) {
  const lot = await prisma.stockLot.create({
    data: {
      householdId,
      productId,
      locationId,
      bestBeforeDate,
      purchasedAt: new Date(),
    },
  });

  await prisma.stockTransaction.create({
    data: {
      householdId,
      productId,
      stockLotId: lot.id,
      type: 'PURCHASE',
      amount: quantity,
      userId,
    },
  });

  await updateProjections(householdId, productId, lot.id, quantity, 'PURCHASE');

  if (markOpened) {
    await prisma.stockTransaction.create({
      data: {
        householdId,
        productId,
        stockLotId: lot.id,
        type: 'OPEN',
        amount: 0,
        userId,
      },
    });
    await updateProjections(householdId, productId, lot.id, 0, 'OPEN');
  }
}

async function seedProductsAndStock(
  options: CliOptions,
  householdId: string,
  userId: string
): Promise<Map<string, string>> {
  const locationMap = await ensureLocations(householdId);
  const units = await prisma.unit.findMany({ select: { id: true, abbreviation: true, name: true } });
  const unitByAbbrev = new Map(units.map((unit) => [unit.abbreviation, unit.id]));
  const categories = await prisma.ingredientCategory.findMany({
    where: { householdId },
    select: { id: true, name: true, baseUnitId: true },
  });
  const categoryByName = new Map(categories.map((cat) => [cat.name, cat]));

  const selectedProducts = trimBySize(options.size, PRODUCT_PLANS);
  const productIdByName = new Map<string, string>();

  for (const plan of selectedProducts) {
    const primaryCategoryName = plan.mappings?.[0]?.categoryName;
    const primaryCategory = primaryCategoryName ? categoryByName.get(primaryCategoryName) : null;
    const stockUnitId =
      (plan.stockUnitAbbreviation ? unitByAbbrev.get(plan.stockUnitAbbreviation) : null) ??
      primaryCategory?.baseUnitId ??
      unitByAbbrev.get('g');
    const purchaseUnitId =
      (plan.purchaseUnitAbbreviation ? unitByAbbrev.get(plan.purchaseUnitAbbreviation) : null) ??
      stockUnitId;

    if (!stockUnitId || !purchaseUnitId) {
      throw new Error(`Unable to resolve units for product "${plan.name}"`);
    }

    const defaultLocationId = (plan.defaultLocationName && locationMap.get(plan.defaultLocationName))
      || locationMap.get('Dispensa');
    if (!defaultLocationId) {
      throw new Error('Default location "Dispensa" not found');
    }

    const existing = await prisma.product.findFirst({
      where: { householdId, name: plan.name },
      select: { id: true },
    });

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            description: plan.description,
            stockUnitId,
            purchaseUnitId,
            purchaseToStockFactor: plan.purchaseToStockFactor ?? 1,
            minStockAmount: plan.minStockAmount ?? null,
            defaultLocationId,
            shelfLifeDays: plan.shelfLifeDays ?? null,
          },
          select: { id: true, name: true },
        })
      : await prisma.product.create({
          data: {
            householdId,
            name: plan.name,
            description: plan.description,
            stockUnitId,
            purchaseUnitId,
            purchaseToStockFactor: plan.purchaseToStockFactor ?? 1,
            minStockAmount: plan.minStockAmount ?? null,
            defaultLocationId,
            shelfLifeDays: plan.shelfLifeDays ?? null,
          },
          select: { id: true, name: true },
        });

    productIdByName.set(product.name, product.id);

    if (plan.mappings && plan.mappings.length > 0) {
      for (const mappingPlan of plan.mappings) {
        const category = categoryByName.get(mappingPlan.categoryName);
        if (!category) continue;

        await prisma.productIngredientCategory.upsert({
          where: {
            productId_ingredientCategoryId: {
              productId: product.id,
              ingredientCategoryId: category.id,
            },
          },
          update: { priority: mappingPlan.priority },
          create: {
            productId: product.id,
            ingredientCategoryId: category.id,
            priority: mappingPlan.priority,
          },
        });
      }
    }

    const targetQuantity = plan.lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const productState = await prisma.product.findUnique({
      where: { id: product.id },
      select: {
        currentStock: { select: { quantity: true } },
        _count: { select: { stockLots: true } },
      },
    });

    const currentQuantity = productState?.currentStock?.quantity ?? 0;
    const hasExistingLots = (productState?._count.stockLots ?? 0) > 0;

    if (!hasExistingLots) {
      for (const lot of plan.lots) {
        const lotLocationId = locationMap.get(lot.locationName) || defaultLocationId;
        await createPurchaseLot(
          householdId,
          userId,
          product.id,
          lotLocationId,
          lot.quantity,
          getBestBeforeDate(lot.bestBeforeOffsetDays),
          lot.markOpened ?? false
        );
      }
      continue;
    }

    if (currentQuantity < targetQuantity) {
      const deficit = Number((targetQuantity - currentQuantity).toFixed(2));
      if (deficit > 0) {
        const fallbackLocationId = locationMap.get(plan.defaultLocationName || '') || defaultLocationId;
        await createPurchaseLot(
          householdId,
          userId,
          product.id,
          fallbackLocationId,
          deficit,
          getBestBeforeDate(20),
          false
        );
      }
    }
  }

  return productIdByName;
}

async function seedRecipes(options: CliOptions, householdId: string) {
  const recipes = trimBySize(options.size, RECIPE_PLANS);
  const categories = await prisma.ingredientCategory.findMany({
    where: { householdId },
    select: { id: true, name: true, baseUnitId: true },
  });
  const categoryByName = new Map(categories.map((cat) => [cat.name, cat]));

  for (const plan of recipes) {
    const existing = await prisma.recipe.findFirst({
      where: { householdId, name: plan.name },
      select: { id: true },
    });

    const recipe = existing
      ? await prisma.recipe.update({
          where: { id: existing.id },
          data: {
            description: plan.description,
            servings: plan.servings,
          },
          select: { id: true },
        })
      : await prisma.recipe.create({
          data: {
            householdId,
            name: plan.name,
            description: plan.description,
            servings: plan.servings,
          },
          select: { id: true },
        });

    for (const ingredient of plan.ingredients) {
      const category = categoryByName.get(ingredient.categoryName);
      if (!category) continue;

      const existingIngredient = await prisma.recipeIngredient.findFirst({
        where: {
          recipeId: recipe.id,
          ingredientCategoryId: category.id,
        },
        select: { id: true },
      });

      if (existingIngredient) {
        await prisma.recipeIngredient.update({
          where: { id: existingIngredient.id },
          data: {
            quantity: ingredient.quantity,
            unitId: category.baseUnitId,
          },
        });
      } else {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientCategoryId: category.id,
            quantity: ingredient.quantity,
            unitId: category.baseUnitId,
          },
        });
      }
    }
  }
}

async function seedShoppingItems(
  options: CliOptions,
  householdId: string,
  productIdsByName: Map<string, string>
) {
  const selectedProducts = trimBySize(options.size, PRODUCT_PLANS);

  for (const plan of selectedProducts) {
    if (!plan.shopping) continue;
    const productId = productIdsByName.get(plan.name);
    if (!productId) continue;

    await prisma.shoppingListItem.upsert({
      where: {
        householdId_productId: {
          householdId,
          productId,
        },
      },
      update: {
        quantity: plan.shopping.quantity,
        isSuggested: plan.shopping.isSuggested,
        purchased: plan.shopping.purchased,
        purchasedAt: plan.shopping.purchased ? new Date() : null,
      },
      create: {
        householdId,
        productId,
        quantity: plan.shopping.quantity,
        isSuggested: plan.shopping.isSuggested,
        purchased: plan.shopping.purchased,
        purchasedAt: plan.shopping.purchased ? new Date() : null,
      },
    });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('Starting screenshot seed...');
  console.log(`  size: ${options.size}`);
  console.log(`  household: ${options.householdName}`);
  console.log(`  email: ${options.email}`);

  await seedGlobalData();

  const { userId, householdId } = await ensureDemoUserAndHousehold(options);
  await seedHouseholdData(householdId);

  const productIdsByName = await seedProductsAndStock(options, householdId, userId);
  await seedRecipes(options, householdId);
  await seedShoppingItems(options, householdId, productIdsByName);

  const [productCount, recipeCount, stockCount, shoppingCount] = await Promise.all([
    prisma.product.count({ where: { householdId } }),
    prisma.recipe.count({ where: { householdId } }),
    prisma.currentStock.count({ where: { householdId, quantity: { gt: 0 } } }),
    prisma.shoppingListItem.count({ where: { householdId } }),
  ]);

  console.log('\nScreenshot seed completed.');
  console.log(`  householdId: ${householdId}`);
  console.log(`  userId: ${userId}`);
  console.log(`  products: ${productCount}`);
  console.log(`  recipes: ${recipeCount}`);
  console.log(`  products in stock: ${stockCount}`);
  console.log(`  shopping items: ${shoppingCount}`);
  console.log('\nDefault login:');
  console.log(`  email: ${options.email}`);
  console.log(`  password: ${options.password}`);
}

main()
  .catch((error) => {
    console.error('\nScreenshot seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
