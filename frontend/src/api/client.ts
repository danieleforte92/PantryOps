// API client for backend communication

// API client for backend communication

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';


async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
}

// Auth
export const authApi = {
    register: (data: { email: string; password: string; name?: string; householdName: string }) =>
        fetchApi<{ user: User; household: Household }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    login: (data: { email: string; password: string }) =>
        fetchApi<{ user: User; household: Household | null }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Products
export const productsApi = {
    scan: (code: string, householdId: string) =>
        fetchApi<ScanResult>(`/products/scan/${code}?householdId=${householdId}`),

    getAll: (householdId: string) =>
        fetchApi<{ products: Product[] }>(`/products?householdId=${householdId}`),

    create: (data: CreateProductData) =>
        fetchApi<{ product: Product }>('/products', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getUnits: () => fetchApi<{ units: Unit[] }>('/products/units'),

    getLocations: (householdId: string) =>
        fetchApi<{ locations: Location[] }>(`/products/locations?householdId=${householdId}`),
};

// Stock Commands
export const stockApi = {
    purchase: (data: PurchaseData) =>
        fetchApi<{ success: boolean; lot: StockLot }>('/stock/purchase', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    consume: (data: ConsumeData) =>
        fetchApi<{ success: boolean; consumed: number; remainingStock: number }>('/stock/consume', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    open: (data: { householdId: string; userId: string; stockLotId: string }) =>
        fetchApi<{ success: boolean }>('/stock/open', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    convertTutorial: (lotId: string, data: { bestBeforeDate: string; userId: string }) =>
        fetchApi<{ success: boolean; message: string; bonusPoints: number; newBadge?: { type: string; name: string; description: string; icon: string; points: number } }>(`/stock/convert-tutorial/${lotId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Shopping List Commands
export const shoppingApi = {
    add: (data: { householdId: string; productId: string; quantity: number; isSuggested?: boolean }) =>
        fetchApi<{ item: ShoppingListItem }>('/shopping', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    remove: (id: string) =>
        fetchApi<{ success: boolean }>(`/shopping/${id}`, {
            method: 'DELETE',
        }),

    update: (id: string, quantity: number) =>
        fetchApi<{ item: ShoppingListItem }>(`/shopping/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
        }),

    togglePurchased: (id: string, purchased: boolean) =>
        fetchApi<{ item: ShoppingListItem }>(`/shopping/${id}/purchased`, {
            method: 'PATCH',
            body: JSON.stringify({ purchased }),
        }),

    clearPurchased: () =>
        fetchApi<{ count: number }>('/shopping/purchased', {
            method: 'DELETE',
        }),

    syncSuggestions: (householdId: string) =>
        fetchApi<{ created: number; updated: number; removed: number }>('/shopping/sync-suggestions', {
            method: 'POST',
            body: JSON.stringify({ householdId }),
        }),
};

// Queries
export const queriesApi = {
    getCurrentStock: (householdId: string) =>
        fetchApi<{ stock: StockItem[] }>(`/queries/current-stock?householdId=${householdId}`),

    getExpiring: (householdId: string, days = 7) =>
        fetchApi<ExpiringItems>(`/queries/expiring?householdId=${householdId}&days=${days}`),

    getLowStock: (householdId: string) =>
        fetchApi<{ lowStock: LowStockItem[] }>(`/queries/low-stock?householdId=${householdId}`),

    getShoppingList: (householdId: string) =>
        fetchApi<{ suggestions: ShoppingSuggestion[]; manualItems: ShoppingListItem[]; all: ShoppingListItem[] }>(`/queries/shopping-list?householdId=${householdId}`),

    getTutorialProducts: (householdId: string) =>
        fetchApi<{ tutorialProducts: TutorialProduct[]; count: number }>(`/queries/tutorial-products?householdId=${householdId}`),
};

// Recipes
export const recipesApi = {
    getAll: (householdId: string) =>
        fetchApi<Recipe[]>(`/recipes?householdId=${householdId}`),

    getById: (id: string) =>
        fetchApi<Recipe>(`/recipes/${id}`),

    create: (data: any) =>
        fetchApi<Recipe>('/recipes', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    preview: (id: string, householdId: string, servings?: number) =>
        fetchApi<RecipePreview>(`/suggestions/recipes/${id}/preview?householdId=${householdId}${servings ? `&servings=${servings}` : ''}`),

    cook: (id: string, userId: string, servings?: number, productSelections?: ProductSelection[]) =>
        fetchApi<{ success: boolean }>(`/stock/recipe-cook/${id}`, {
            method: 'POST',
            body: JSON.stringify({ userId, servings, productSelections }),
        }),
};

// Suggestions
export const suggestionsApi = {
    getToday: (householdId: string) =>
        fetchApi<TodaySuggestion[]>(`/suggestions/today?householdId=${householdId}`),
};

// Ingredient Categories (NEW)
export const ingredientCategoriesApi = {
    getAll: (householdId: string) =>
        fetchApi<{ categories: IngredientCategory[] }>(`/recipes/ingredient-categories?householdId=${householdId}`),
};

// Categories API (NEW)
export const categoriesApi = {
    // List all categories
    getAll: (householdId: string) =>
        fetchApi<{ categories: Category[] }>(`/categories?householdId=${householdId}`),

    // Get category with products (single)
    getWithProducts: (categoryId: string, householdId: string) =>
        fetchApi<{ category: CategoryWithProducts }>(`/categories/${categoryId}?householdId=${householdId}`),

    // Get products in a category
    getProducts: (categoryId: string, householdId: string) =>
        fetchApi<{ products: ProductMapping[] }>(`/categories/${categoryId}/products?householdId=${householdId}`),

    // Assign product to category
    assignProduct: (categoryId: string, productId: string, householdId: string, priority?: number) =>
        fetchApi<{ mapping: ProductMapping }>(`/categories/${categoryId}/products?householdId=${householdId}`, {
            method: 'POST',
            body: JSON.stringify({ productId, priority }),
        }),

    // Remove product from category
    removeProduct: (categoryId: string, productId: string, householdId: string) =>
        fetchApi<{ success: boolean }>(`/categories/${categoryId}/products/${productId}?householdId=${householdId}`, {
            method: 'DELETE',
        }),

    // Update priority
    updatePriority: (categoryId: string, productId: string, householdId: string, priority: number) =>
        fetchApi<{ mapping: ProductMapping }>(`/categories/${categoryId}/products/${productId}/priority?householdId=${householdId}`, {
            method: 'PATCH',
            body: JSON.stringify({ priority }),
        }),

    // Bulk load: all categories with products
    getAllMapped: (householdId: string) =>
        fetchApi<{ categories: CategoryWithProducts[] }>(`/categories/mapped?householdId=${householdId}`),
};

// Generic API client for direct usage
export const api = {
    get: <T>(endpoint: string) => fetchApi<T>(endpoint),
    post: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(endpoint: string, body: unknown) =>
        fetchApi<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: 'DELETE' }),
};

// Types
export interface User {
    id: string;
    email: string;
    name?: string;
    onboardingStep: number;
}

export interface Household {
    id: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string;
    abbreviation: string;
}

export interface Location {
    id: string;
    name: string;
    isFreezer: boolean;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    stockUnit: Unit;
    purchaseUnit: Unit;
    purchaseToStockFactor: number;
    defaultLocation?: Location;
    currentStock?: { quantity: number };
    nutriscore?: string;
    novaGroup?: number;
    ecoScore?: string;
    minStockAmount?: number;
    shelfLifeDays?: number;
    categories?: string[];
}

export interface ScanResult {
    status: 'KNOWN' | 'SUGGESTED' | 'UNKNOWN';
    source?: 'local' | 'openfoodfacts';
    product?: Product;
    suggestion?: {
        name: string;
        brand?: string;
        imageUrl?: string;
        quantity?: string;
        nutriscore?: string;
        novaGroup?: number;
        ecoScore?: string;
        categories?: string[];
    };
    barcode?: string;
}

export interface CreateProductData {
    householdId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    stockUnitId: string;
    purchaseUnitId: string;
    purchaseToStockFactor?: number;
    defaultLocationId?: string;
    minStockAmount?: number;
    shelfLifeDays?: number;
    barcode?: string;
    nutriscore?: string;
    novaGroup?: number;
    ecoScore?: string;
    categories?: string[];
}

export interface PurchaseData {
    householdId: string;
    userId: string;
    productId: string;
    quantity: number;
    locationId?: string;
    bestBeforeDate?: string;
}

export interface ConsumeData {
    householdId: string;
    userId: string;
    productId: string;
    quantity: number;
}

export interface StockLot {
    id: string;
    productId: string;
    locationId: string;
    bestBeforeDate?: string;
}

export interface StockItem {
    householdId: string;
    productId: string;
    quantity: number;
    product: Product;
}

export interface ExpiringItem {
    lotId: string;
    product: { id: string; name: string; imageUrl?: string; unit: string; nutriscore?: string; novaGroup?: number };
    location: string;
    quantity: number;
    bestBeforeDate: string;
    openedAt?: string;
}

export interface ExpiringItems {
    expired: ExpiringItem[];
    today: ExpiringItem[];
    thisWeek: ExpiringItem[];
}

export interface LowStockItem {
    product: { id: string; name: string; imageUrl?: string; unit: string; nutriscore?: string; novaGroup?: number };
    current: number;
    minimum: number;
    needed: number;
}

export interface ShoppingListItem {
    id: string;
    product: { id: string; name: string; imageUrl?: string; nutriscore?: string; novaGroup?: number };
    quantity: number;
    purchased: boolean;
    purchasedAt?: string;
    isSuggested: boolean;
    purchaseUnit: string;
    currentStock?: number;
    minStock?: number;
}

export interface ShoppingSuggestion {
    product: { id: string; name: string; imageUrl?: string; nutriscore?: string; novaGroup?: number };
    currentStock: number;
    minStock: number;
    neededStockUnits: number;
    purchaseQuantity: number;
    purchaseUnit: string;
    isSuggestion: true;
}

export interface Recipe {
    id: string;
    name: string;
    servings: number;
    source: 'MANUAL' | 'GENERATED';
    ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
    id: string;
    // LEGACY: product-based ingredient
    productId?: string;
    product?: Product;
    // NEW: category-based ingredient
    ingredientCategoryId?: string;
    ingredientCategory?: IngredientCategory;
    quantity: number;
    unit: Unit;
}

export interface IngredientCategory {
    id: string;
    name: string;
    baseUnit: Unit;
}

// Category types for product-category mapping
export interface Category {
    id: string;
    name: string;
    baseUnit: Unit;
    productCount?: number;
}

export interface CategoryWithProducts {
    id: string;
    name: string;
    baseUnit: {
        id: string;
        name: string;
        abbreviation: string;
    };
    products: ProductMapping[];
}

export interface ProductMapping {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    priority: number;
    currentStock: number;
    stockUnitId: string;
    stockUnitName: string;
}

export interface RecipePreviewItem {
    productId: string;
    productName: string;
    required: number;
    available: number;
    missing: number;
    unit: string;
    suggestedProducts?: SuggestedProduct[];
}

export interface RecipePreview {
    ingredients: RecipePreviewItem[];
    canCook: boolean;
}

// Step 5: Suggested products for category-based cooking
export interface SuggestedProduct {
    productId: string;
    productName: string;
    productImage: string | null;
    priority: number;
    availableQuantity: number;
    stockUnitName: string;
    suggestedQuantity: number;
}

export interface ProductSelection {
    categoryId?: string;
    productId: string;
    quantity: number;
}

export interface TodaySuggestion {
    id: string;
    title: string;
    matchPercentage: number;
    missingIngredientsCount: number;
    usesExpiringItems: boolean;
}

export interface TutorialProduct {
    lotId: string;
    productId: string;
    name: string;
    quantity: number;
    unit: string;
    location: string;
    addedAt: string;
}

// Gamification API
export const gamificationApi = {
    getProfile: (userId: string) =>
        fetchApi<GamificationProfile>(`/gamification/profile?userId=${userId}`),

    trackActivity: (data: { userId: string; householdId: string; type: 'SCAN' | 'COOK' | 'RECIPE_CREATE' }) =>
        fetchApi<{ pointsEarned: number; totalPoints: number; newBadges: string[] }>('/gamification/track', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getAIStatus: (userId: string) =>
        fetchApi<{ unlocked: boolean; totalPoints: number; requiredPoints: number; remainingPoints: number }>(
            `/gamification/ai-status?userId=${userId}`
        ),

    getLeaderboard: (householdId: string) =>
        fetchApi<{ leaderboard: LeaderboardEntry[] }>(`/gamification/household/${householdId}/leaderboard`),

    updateStreak: (data: { userId: string; householdId: string }) =>
        fetchApi<{ currentStreak: number; longestStreak: number; newBadges: string[] }>('/gamification/update-streak', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Gamification Types
export interface Badge {
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    earnedAt: string;
}

export interface GamificationProfile {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string;
    mealsSaved: number;
    recipesCreated: number;
    recipesCooked: number;
    tutorialProductsAdded: number;
    badges: Badge[];
    aiUnlocked: boolean;
    aiBadgeEarned: boolean;
    nextUnlock: {
        points: number;
        feature: string;
        remaining: number;
    } | null;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    totalPoints: number;
    badges: number;
    currentStreak: number;
}
