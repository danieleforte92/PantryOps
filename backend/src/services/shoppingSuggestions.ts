import prisma from '../lib/prisma';

/**
 * Sync shopping list suggestions with low-stock products
 * Creates, updates, or removes ShoppingListItem entries with isSuggested=true
 */
export async function syncSuggestions(householdId: string) {
  const stats = { created: 0, updated: 0, removed: 0 };

  await prisma.$transaction(async (tx) => {
    // 1. Get all products with minStockAmount defined
    const products = await tx.product.findMany({
      where: {
        householdId,
        minStockAmount: { not: null },
      },
      include: {
        stockUnit: true,
        purchaseUnit: true,
        currentStock: true,
      },
    });

    const productIdsWithMinStock = new Set(products.map(p => p.id));
    const productIdsToKeep = new Set<string>();

    // 2. Process each product
    for (const product of products) {
      const minStock = product.minStockAmount ?? 0;
      const currentStock = product.currentStock?.quantity ?? 0;

      // Calculate needed quantity in stock units
      const neededStockUnits = Math.max(0, minStock - currentStock);

      if (neededStockUnits > 0) {
        // Convert to purchase units
        const purchaseQuantity = Math.ceil(neededStockUnits / product.purchaseToStockFactor);

        // Check if shopping item already exists
        const existingItem = await tx.shoppingListItem.findUnique({
          where: {
            householdId_productId: { householdId, productId: product.id },
          },
        });

        if (existingItem) {
          // Update existing item if quantity changed
          if (existingItem.quantity !== purchaseQuantity) {
            await tx.shoppingListItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: purchaseQuantity,
                isSuggested: true,
                purchased: false, // Reset purchased status if needed again
                purchasedAt: null,
              },
            });
            stats.updated++;
          }
          productIdsToKeep.add(existingItem.id);
        } else {
          // Create new suggested item
          await tx.shoppingListItem.create({
            data: {
              householdId,
              productId: product.id,
              quantity: purchaseQuantity,
              isSuggested: true,
              purchased: false,
            },
          });
          stats.created++;
          productIdsToKeep.add(`${householdId}_${product.id}`);
        }
      }
    }

    // 3. Remove suggested items that are no longer needed
    const existingSuggestedItems = await tx.shoppingListItem.findMany({
      where: {
        householdId,
        isSuggested: true,
      },
    });

    for (const item of existingSuggestedItems) {
      // Remove if product no longer has minStockAmount or stock is sufficient
      const product = products.find(p => p.id === item.productId);
      const shouldRemove = !product || ((product.minStockAmount ?? 0) <= (product.currentStock?.quantity ?? 0));

      if (shouldRemove) {
        await tx.shoppingListItem.delete({
          where: { id: item.id },
        });
        stats.removed++;
      }
    }
  });

  return stats;
}

/**
 * Get shopping suggestions for a household
 * Returns products that are below min-stock threshold
 */
export async function getSuggestions(householdId: string) {
  const products = await prisma.product.findMany({
    where: {
      householdId,
      minStockAmount: { not: null },
    },
    include: {
      stockUnit: true,
      purchaseUnit: true,
      currentStock: true,
    },
  });

  const suggestions = products
    .filter(p => {
      const current = p.currentStock?.quantity ?? 0;
      return current < (p.minStockAmount ?? 0);
    })
    .map(p => {
      const current = p.currentStock?.quantity ?? 0;
      const needed = (p.minStockAmount ?? 0) - current;
      const purchaseQuantity = Math.ceil(needed / p.purchaseToStockFactor);

      return {
        productId: p.id,
        productName: p.name,
        productImage: p.imageUrl,
        currentStock: current,
        minStock: p.minStockAmount ?? 0,
        neededStockUnits: needed,
        purchaseQuantity,
        purchaseUnit: p.purchaseUnit.abbreviation,
        stockUnit: p.stockUnit.abbreviation,
      };
    });

  return suggestions;
}
