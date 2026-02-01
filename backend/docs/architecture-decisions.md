# Architecture Decision Record: Product-Category Separation

## Status: Implemented ✅

## Context

Il sistema gestisce ricette universali (es. "Pasta al pomodoro") che non devono dipendere da prodotti specifici (es. "Barilla Spaghetti n.5" vs "De Cecco Spaghetti").

## Decision

### 1. Recipe Domain: Solo Categorie

Le ricette **devono** usare solo `ingredientCategoryId`:

```typescript
// ✅ CORRETTO
interface RecipeIngredient {
  ingredientCategoryId: string;  // "Pasta secca"
  quantity: number;              // 100g
  unitId: string;
}

// ⚠️ DEPRECATO - Usare solo per backward compatibility
interface RecipeIngredient {
  productId?: string;  // Legacy, da evitare
}
```

**Principio**: Le ricette sono universali, il prodotto specifico viene scelto durante il cooking.

### 2. Stock Domain: Selezione Prodotto

La selezione del prodotto avviene **solo** nel momento del cooking:

1. **Preview** (`/recipes/:id/preview`): Suggerisce prodotti basati su FEFO + Priority
2. **Cook** (`/stock/recipe-cook/:id`): L'utente può accettare o modificare i suggerimenti

### 3. Consumption Engine: Single Source of Truth

Tutta la logica di calcolo consumo è centralizzata in `consumptionEngine.ts`:

```typescript
// Usato sia per preview che per cook
computeConsumption({
  ingredientCategoryId,
  requestedQuantity,
  householdId,
  mode: 'preview' | 'commit'
});
```

**Vantaggi**:
- Preview e Cook usano la stessa logica (coerenza)
- FEFO gestito in un unico punto
- Facile testare e debuggare

## Consequences

### Positive
- ✅ Ricette universali (non legate a brand)
- ✅ Flessibilità: stessa ricetta può usare prodotti diversi
- ✅ Prevenzione sprechi: FEFO automatico
- ✅ User preference: Priority configurabile

### Negative
- ⚠️ Maggiore complessità in fase di cooking
- ⚠️ UX deve gestire selezione prodotti

## Implementation

### Backend
- `consumptionEngine.ts`: Logica centralizzata
- `suggestions.ts`: Usa Consumption Engine per preview
- `stock.ts`: Usa Consumption Engine per cook

### Frontend
- `ProductSelectionModal.tsx`: UI per selezione prodotti
- `RecipeDetailModal.tsx`: Integra selezione prima di cook

## Migration Path

Per ricette legacy con `productId`:
1. Creare `IngredientCategory` appropriata
2. Mappare prodotto alla categoria
3. Aggiornare ricetta per usare `ingredientCategoryId`
4. Rimuovere `productId` (opzionale, mantenuto per backward compatibility)

## References

- Technical Debt: `docs/technical-debt.md`
- Consumption Engine: `src/services/consumptionEngine.ts`
