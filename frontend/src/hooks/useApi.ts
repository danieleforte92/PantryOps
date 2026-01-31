import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queriesApi, stockApi, productsApi, shoppingApi, recipesApi, suggestionsApi, ingredientCategoriesApi, categoriesApi } from '../api/client';

// Get current user context (for MVP, stored in localStorage)
export function useAuth() {
    const stored = localStorage.getItem('bettergrocy_auth');
    if (!stored) return { user: null, household: null };

    try {
        return JSON.parse(stored);
    } catch {
        return { user: null, household: null };
    }
}

export function setAuth(user: any, household: any) {
    localStorage.setItem('bettergrocy_auth', JSON.stringify({ user, household }));
}

export function clearAuth() {
    localStorage.removeItem('bettergrocy_auth');
}

// Current Stock Query
export function useCurrentStock() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['current-stock', household?.id],
        queryFn: () => queriesApi.getCurrentStock(household.id),
        enabled: !!household?.id,
    });
}

// Expiring Items Query
export function useExpiringItems(days = 7) {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['expiring', household?.id, days],
        queryFn: () => queriesApi.getExpiring(household.id, days),
        enabled: !!household?.id,
    });
}

// Low Stock Query
export function useLowStock() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['low-stock', household?.id],
        queryFn: () => queriesApi.getLowStock(household.id),
        enabled: !!household?.id,
    });
}

// Shopping List Query
export function useShoppingList() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['shopping-list', household?.id],
        queryFn: () => queriesApi.getShoppingList(household.id),
        enabled: !!household?.id,
    });
}

// Add Shopping Item
export function useAddShoppingItem() {
    const queryClient = useQueryClient();
    const { household } = useAuth();

    return useMutation({
        mutationFn: (data: { productId: string; quantity: number }) =>
            shoppingApi.add({ ...data, householdId: household.id, isSuggested: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Remove Shopping Item
export function useRemoveShoppingItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => shoppingApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Update Shopping Item Quantity
export function useUpdateShoppingQuantity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
            shoppingApi.update(id, quantity),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Toggle Shopping Item Purchased
export function useToggleShoppingPurchased() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, purchased }: { id: string; purchased: boolean }) =>
            shoppingApi.togglePurchased(id, purchased),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Clear Purchased Items
export function useClearPurchasedItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => shoppingApi.clearPurchased(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Sync Shopping Suggestions
export function useSyncShoppingSuggestions() {
    const queryClient = useQueryClient();
    const { household } = useAuth();

    return useMutation({
        mutationFn: () => shoppingApi.syncSuggestions(household.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
        },
    });
}

// Products Query
export function useProducts() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['products', household?.id],
        queryFn: () => productsApi.getAll(household.id),
        enabled: !!household?.id,
    });
}

// Units Query
export function useUnits() {
    return useQuery({
        queryKey: ['units'],
        queryFn: () => productsApi.getUnits(),
    });
}

// Locations Query
export function useLocations() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['locations', household?.id],
        queryFn: () => productsApi.getLocations(household.id),
        enabled: !!household?.id,
    });
}

// Purchase Mutation
export function usePurchase() {
    const queryClient = useQueryClient();
    const { user, household } = useAuth();

    return useMutation({
        mutationFn: (data: { productId: string; quantity: number; locationId?: string; bestBeforeDate?: string }) =>
            stockApi.purchase({
                ...data,
                householdId: household.id,
                userId: user.id,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-stock'] });
            queryClient.invalidateQueries({ queryKey: ['expiring'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock'] });
        },
    });
}

// Consume Mutation
export function useConsume() {
    const queryClient = useQueryClient();
    const { user, household } = useAuth();

    return useMutation({
        mutationFn: (data: { productId: string; quantity: number }) =>
            stockApi.consume({
                ...data,
                householdId: household.id,
                userId: user.id,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-stock'] });
            queryClient.invalidateQueries({ queryKey: ['expiring'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock'] });
        },
    });
}

// Scan Product
export function useScanProduct() {
    const { household } = useAuth();

    return useMutation({
        mutationFn: (barcode: string) => productsApi.scan(barcode, household.id),
    });
}

// Create Product
export function useCreateProduct() {
    const queryClient = useQueryClient();
    const { household } = useAuth();

    return useMutation({
        mutationFn: (data: Omit<Parameters<typeof productsApi.create>[0], 'householdId'>) =>
            productsApi.create({ ...data, householdId: household.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

// Today's Suggestions for "Oggi" Dashboard
export function useTodaySuggestions() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['today-suggestions', household?.id],
        queryFn: () => suggestionsApi.getToday(household.id),
        enabled: !!household?.id,
    });
}

// All Recipes
export function useRecipes() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['recipes', household?.id],
        queryFn: () => recipesApi.getAll(household.id),
        enabled: !!household?.id,
    });
}

// Recipe Detail & Preview
export function useRecipePreview(recipeId: string, servings?: number) {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['recipe-preview', recipeId, servings],
        queryFn: () => recipesApi.preview(recipeId, servings),
        enabled: !!household?.id && !!recipeId,
    });
}

// Cook Recipe Mutation
export function useCookRecipe() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: ({ recipeId, servings }: { recipeId: string; servings?: number }) =>
            recipesApi.cook(recipeId, user.id, servings),
        onSuccess: () => {
            // Invalidate everything stock related
            queryClient.invalidateQueries({ queryKey: ['current-stock'] });
            queryClient.invalidateQueries({ queryKey: ['expiring'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock'] });
            queryClient.invalidateQueries({ queryKey: ['today-suggestions'] });
        },
    });
}

// Create Recipe Mutation
export function useCreateRecipe() {
    const queryClient = useQueryClient();
    const { household } = useAuth();

    return useMutation({
        mutationFn: (data: { name: string; servings: number; ingredients: { productId?: string; ingredientCategoryId?: string; quantity: number; unitId: string }[] }) =>
            recipesApi.create({ ...data, householdId: household.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
        },
    });
}

// Ingredient Categories Query
export function useIngredientCategories() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['ingredient-categories', household?.id],
        queryFn: () => ingredientCategoriesApi.getAll(household.id),
        enabled: !!household?.id,
    });
}

// Categories Query
export function useCategories() {
    const { household } = useAuth();
    return useQuery({
        queryKey: ['categories', household?.id],
        queryFn: () => categoriesApi.getAll(household.id),
        enabled: !!household?.id,
    });
}

// Categories with Mappings Query (for UI)
export function useCategoriesWithMappings() {
    const { household } = useAuth();
    return useQuery({
        queryKey: ['categories-mapped', household?.id],
        queryFn: () => categoriesApi.getAllMapped(household.id),
        enabled: !!household?.id,
    });
}

// Assign Product to Category Mutation
export function useAssignProductToCategory() {
    const queryClient = useQueryClient();
    const { household } = useAuth();
    return useMutation({
        mutationFn: ({ categoryId, productId, priority }: { categoryId: string; productId: string; priority?: number }) =>
            categoriesApi.assignProduct(categoryId, productId, household.id, priority),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories-mapped'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

// Remove Product from Category Mutation
export function useRemoveProductFromCategory() {
    const queryClient = useQueryClient();
    const { household } = useAuth();
    return useMutation({
        mutationFn: ({ categoryId, productId }: { categoryId: string; productId: string }) =>
            categoriesApi.removeProduct(categoryId, productId, household.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories-mapped'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

// Update Mapping Priority Mutation
export function useUpdateMappingPriority() {
    const queryClient = useQueryClient();
    const { household } = useAuth();
    return useMutation({
        mutationFn: ({ categoryId, productId, priority }: { categoryId: string; productId: string; priority: number }) =>
            categoriesApi.updatePriority(categoryId, productId, household.id, priority),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories-mapped'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}
