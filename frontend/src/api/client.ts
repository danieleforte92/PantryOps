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

    preview: (id: string, servings?: number) =>
        fetchApi<RecipePreview>(`/suggestions/recipes/${id}/preview${servings ? `?servings=${servings}` : ''}`),

    cook: (id: string, userId: string, servings?: number) =>
        fetchApi<{ success: boolean }>(`/stock/recipe-cook/${id}`, {
            method: 'POST',
            body: JSON.stringify({ userId, servings }),
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

// Types
export interface User {
    id: string;
    email: string;
    name?: string;
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

export interface RecipePreviewItem {
    productId: string;
    productName: string;
    required: number;
    available: number;
    missing: number;
    unit: string;
}

export interface RecipePreview {
    ingredients: RecipePreviewItem[];
    canCook: boolean;
}

export interface TodaySuggestion {
    id: string;
    title: string;
    matchPercentage: number;
    missingIngredientsCount: number;
    usesExpiringItems: boolean;
}
