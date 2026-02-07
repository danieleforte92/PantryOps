# Technical Debt - PantryOps

## Category Resolution Logic - Performance & Future Enhancements

### Current Implementation (Step 4)

**Approach:**
- Per recipe ingredient category, query all products in category + their lots
- Sort by Priority (ASC) → Total Available (DESC)
- Use only `bestBeforeDate` for FEFO (not `openedAt`)

**Query Count:**
- Recipe with 5 category ingredients = 5 separate queries
- Each query: `prisma.productIngredientCategory.findMany()` with nested includes
- Estimated cost per query: ~50-100ms (depending on data size)

**Known Issues:**

#### 1. N+1 Query Problem (Low Priority)
When loading "today" suggestions with multiple recipes:
- Each recipe → each category ingredient → separate `resolveCategoryStock()` call
- For 5 recipes × 2 category ingredients = 10 separate queries
- **Impact:** Acceptable for MVP (UI load time < 2s expected)
- **Future Fix:** Batch load all categories once, cache in memory during request

#### 2. Missing `openedAt` in FEFO (Medium Priority)
**Current:** Only uses `bestBeforeDate` for expiring check
**Problem:** Opened products expire faster (e.g., cheese lasts 30 days unopened, 7 days opened)
**Impact:** May suggest products that will expire sooner once opened
**Future Fix:** 
- Add `openedAt` consideration in FEFO sorting
- Formula: `effectiveExpiryDate = bestBeforeDate - (openedAt ? openedShelfLifeDays : 0)`
- User Story: "When suggesting which product to cook, prioritize already-opened items"

#### 3. SuggestedProducts Not Returned in Preview (High Priority for Step 5)
**Current (Step 4):** `resolveCategoryStock()` calculates suggested products but doesn't return them in preview response
**Problem:** Frontend cannot show which specific products would be used
**Impact:** User cannot see FEFO recommendation before cooking
**Future Fix (Step 5):** Extend `RecipePreviewItem` type to include:
```typescript
{
  productId: string | null,  // null = category-based
  productName: string,
  required: number,
  available: number,
  missing: number,
  unit: string,
  suggestedProducts?: Array<{  // NEW
    productId: string;
    productName: string;
    suggestedQuantity: number;
    priority: number;
    availableQuantity: number;
  }>
}
```

#### 4. No Cross-Category Stock Aggregation (Low Priority)
**Current:** Category stock is sum of all products in category
**Problem:** If recipe uses 2 ingredients that map to same category, double-counting occurs
**Example:** Recipe uses "Pasta secca" twice (different products) → counts same stock twice
**Impact:** Could allow cooking with insufficient stock (edge case)
**Future Fix:** Track allocated stock during category resolution to prevent double-counting

### Performance Benchmarks

**TODO:** Add actual benchmarks after Step 4 implementation:
- Query time for single category resolution
- Total load time for `/today` endpoint
- Database query analysis (EXPLAIN ANALYZE)

### Future Enhancements

#### 1. Priority-Based Expiring Bonus
**Idea:** When calculating recipe match percentage for `/today`, add bonus for recipes that use priority products
**Example:** Recipe using priority 1 pasta = +10% match bonus
**User Story:** "Suggest recipes that use my preferred brands/ingredients first"

#### 2. Category-Based Shopping Suggestions
**Current:** Shopping list only suggests products with `minStockAmount`
**Future:** Add category-based suggestions: "Low on 'Pasta secca' category? Add any pasta product to shopping list"
**User Story:** "Shopping list suggests based on ingredient categories, not just specific products"

#### 3. User Preference Learning
**Idea:** Track which products user selects when cooking with categories, auto-adjust priorities
**Example:** User always chooses De Cecco over Barilla → lower De Cecco's priority over time
**User Story:** "App learns my preferences over time"

---
