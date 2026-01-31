/**
 * Static seed data for BetterGrocy
 * 
 * Contains default units, ingredient categories, demo products, and demo recipes.
 * All data is designed to be idempotent - safe to re-run without duplicates.
 */

export interface SeedUnit {
  name: string;
  abbreviation: string;
}

export interface SeedCategory {
  name: string;
  baseUnitName: string;
}

export interface SeedDemoProduct {
  name: string;
  categoryName: string;
  barcode?: string;
}

export interface SeedDemoRecipeIngredient {
  categoryName: string;
  quantity: number;
}

export interface SeedDemoRecipe {
  name: string;
  servings: number;
  ingredients: SeedDemoRecipeIngredient[];
}

/**
 * Base measurement units used throughout the app
 */
export const DEFAULT_UNITS: SeedUnit[] = [
  { name: 'Pezzi', abbreviation: 'pz' },
  { name: 'Grammi', abbreviation: 'g' },
  { name: 'Chilogrammi', abbreviation: 'kg' },
  { name: 'Millilitri', abbreviation: 'ml' },
  { name: 'Litri', abbreviation: 'l' },
  { name: 'Bottiglie', abbreviation: 'bot' },
  { name: 'Confezioni', abbreviation: 'conf' },
];

/**
 * Default ingredient categories for recipe creation
 * Each category has a base unit for consistent measurements
 */
export const DEFAULT_CATEGORIES: SeedCategory[] = [
  { name: 'Pasta secca', baseUnitName: 'Grammi' },
  { name: 'Riso', baseUnitName: 'Grammi' },
  { name: 'Verdure fresche', baseUnitName: 'Grammi' },
  { name: 'Pomodori (conserva)', baseUnitName: 'Grammi' },
  { name: 'Olio vegetale', baseUnitName: 'Millilitri' },
  { name: 'Formaggio', baseUnitName: 'Grammi' },
  { name: 'Carne', baseUnitName: 'Grammi' },
];

/**
 * Demo products for onboarding and testing
 * Each product is mapped to an ingredient category
 * Note: Demo products are created without stock - user must add stock manually
 */
export const DEMO_PRODUCTS: SeedDemoProduct[] = [
  {
    name: 'Barilla Spaghetti n.5',
    categoryName: 'Pasta secca',
    barcode: '8076809523118',
  },
  {
    name: 'Riso Arborio Scotti',
    categoryName: 'Riso',
    barcode: '8002400021029',
  },
  {
    name: 'Pomodori Pelati Mutti',
    categoryName: 'Pomodori (conserva)',
    barcode: '8005110100015',
  },
  {
    name: 'Olio Extravergine Bertolli',
    categoryName: 'Olio vegetale',
    barcode: '8001120670007',
  },
  {
    name: 'Parmigiano Reggiano',
    categoryName: 'Formaggio',
    barcode: '8001234567890',
  },
  {
    name: 'Petto di Pollo',
    categoryName: 'Carne',
    barcode: '8001234567891',
  },
];

/**
 * Demo recipes for showcasing the app's capabilities
 * These are "system" recipes that demonstrate the suggestion features
 * All recipes use ingredient categories (not specific products)
 */
export const DEMO_RECIPES: SeedDemoRecipe[] = [
  {
    name: 'Pasta al pomodoro',
    servings: 2,
    ingredients: [
      { categoryName: 'Pasta secca', quantity: 160 },
      { categoryName: 'Pomodori (conserva)', quantity: 200 },
      { categoryName: 'Olio vegetale', quantity: 30 },
    ],
  },
  {
    name: 'Risotto semplice',
    servings: 2,
    ingredients: [
      { categoryName: 'Riso', quantity: 160 },
      { categoryName: 'Formaggio', quantity: 40 },
      { categoryName: 'Olio vegetale', quantity: 20 },
    ],
  },
];
