/**
 * Consumption Engine
 * 
 * Centralizza la logica di calcolo consumo per ingredienti category-based.
 * Usato da: suggestions (preview), stock (cook), queries (projections)
 * 
 * Architecture Principle:
 * - La ricetta conosce solo la categoria
 * - La selezione prodotto avviene qui (FEFO + Priority)
 * - Mai business logic duplicata tra preview e cook
 */

import prisma from '../lib/prisma';
import { resolveCategoryStock } from './categoryService';

export interface ConsumptionPlan {
  ingredientCategoryId: string;
  categoryName: string;
  requestedQuantity: number;
  totalAvailable: number;
  canFulfill: boolean;
  productAllocations: ProductAllocation[];
}

export interface ProductAllocation {
  productId: string;
  productName: string;
  quantity: number;
  lots: LotAllocation[];
}

export interface LotAllocation {
  lotId: string;
  amount: number;
  bestBeforeDate?: Date;
}

export type ConsumptionMode = 'preview' | 'commit';

/**
 * Calcola il piano di consumo per un ingrediente category-based
 * 
 * @param ingredientCategoryId - ID della categoria
 * @param requestedQuantity - Quantità richiesta
 * @param householdId - ID del household
 * @param mode - 'preview' (solo calcolo) o 'commit' (esegue transazioni)
 * @param userId - Richiesto se mode = 'commit'
 * @returns Piano di consumo dettagliato
 */
export async function computeConsumption(
  ingredientCategoryId: string,
  requestedQuantity: number,
  householdId: string,
  mode: 'preview',
  userId?: string
): Promise<ConsumptionPlan>;

export async function computeConsumption(
  ingredientCategoryId: string,
  requestedQuantity: number,
  householdId: string,
  mode: 'commit',
  userId: string
): Promise<ConsumptionPlan>;

export async function computeConsumption(
  ingredientCategoryId: string,
  requestedQuantity: number,
  householdId: string,
  mode: ConsumptionMode,
  userId?: string
): Promise<ConsumptionPlan> {
  // 1. Resolve category to products
  const resolution = await resolveCategoryStock(ingredientCategoryId, householdId);
  
  if (resolution.totalAvailable === 0) {
    return {
      ingredientCategoryId,
      categoryName: '', // Will be filled below
      requestedQuantity,
      totalAvailable: 0,
      canFulfill: false,
      productAllocations: []
    };
  }

  // Get category name
  const category = await prisma.ingredientCategory.findUnique({
    where: { id: ingredientCategoryId },
    select: { name: true }
  });

  // 2. Calculate product allocations (by priority + stock)
  let remainingRequest = requestedQuantity;
  const productAllocations: ProductAllocation[] = [];

  for (const product of resolution.suggestedProducts) {
    if (remainingRequest <= 0) break;
    
    const allocateFromProduct = Math.min(product.availableQuantity, remainingRequest);
    
    if (allocateFromProduct > 0) {
      // 3. Get FEFO lots for this product
      const lots = await prisma.stockLotBalance.findMany({
        where: {
          householdId,
          productId: product.productId,
          remainingQuantity: { gt: 0 }
        },
        orderBy: [
          { bestBeforeDate: 'asc' },
          { purchasedAt: 'asc' }
        ]
      });

      // 4. Allocate across lots
      let remainingForProduct = allocateFromProduct;
      const lotAllocations: LotAllocation[] = [];

      for (const lot of lots) {
        if (remainingForProduct <= 0) break;
        
        const amount = Math.min(lot.remainingQuantity, remainingForProduct);
        lotAllocations.push({
          lotId: lot.stockLotId,
          amount,
          bestBeforeDate: lot.bestBeforeDate || undefined
        });
        
        remainingForProduct -= amount;
      }

      productAllocations.push({
        productId: product.productId,
        productName: product.productName,
        quantity: allocateFromProduct,
        lots: lotAllocations
      });

      remainingRequest -= allocateFromProduct;
    }
  }

  const plan: ConsumptionPlan = {
    ingredientCategoryId,
    categoryName: category?.name || '',
    requestedQuantity,
    totalAvailable: resolution.totalAvailable,
    canFulfill: remainingRequest <= 0,
    productAllocations
  };

  // 5. If commit mode, execute transactions
  if (mode === 'commit' && userId && plan.canFulfill) {
    await prisma.$transaction(async (tx) => {
      for (const productAlloc of plan.productAllocations) {
        for (const lotAlloc of productAlloc.lots) {
          // Create transaction
          await tx.stockTransaction.create({
            data: {
              householdId,
              productId: productAlloc.productId,
              stockLotId: lotAlloc.lotId,
              type: 'CONSUME',
              amount: -lotAlloc.amount,
              userId
            }
          });

          // Update current stock
          await tx.currentStock.update({
            where: { 
              householdId_productId: { 
                householdId, 
                productId: productAlloc.productId 
              } 
            },
            data: { 
              quantity: { decrement: lotAlloc.amount } 
            }
          });

          // Update lot balance
          await tx.stockLotBalance.update({
            where: { stockLotId: lotAlloc.lotId },
            data: { 
              remainingQuantity: { decrement: lotAlloc.amount } 
            }
          });
        }
      }
    });
  }

  return plan;
}

/**
 * Valida se un piano di consumo può essere eseguito
 * Centralizza la validazione per evitare duplicazione
 */
export function validateConsumptionPlan(
  plan: ConsumptionPlan,
  requestedQuantity: number
): { valid: boolean; error?: string; details?: any } {
  if (!plan.canFulfill) {
    return {
      valid: false,
      error: 'STOCK_INSUFFICIENT',
      details: {
        category: plan.categoryName,
        requested: requestedQuantity,
        available: plan.totalAvailable
      }
    };
  }

  // Check that allocations sum to requested (or more)
  const totalAllocated = plan.productAllocations.reduce(
    (sum, p) => sum + p.quantity, 
    0
  );

  if (totalAllocated < requestedQuantity) {
    return {
      valid: false,
      error: 'INSUFFICIENT_ALLOCATION',
      details: {
        requested: requestedQuantity,
        allocated: totalAllocated
      }
    };
  }

  return { valid: true };
}

/**
 * Verifica se una categoria ha prodotti in scadenza
 * Usato per il bonus "usesExpiringItems" nelle suggestions
 */
export async function hasExpiringProductsInCategory(
  categoryId: string,
  householdId: string,
  beforeDate: Date
): Promise<boolean> {
  const mappings = await prisma.productIngredientCategory.findMany({
    where: { ingredientCategoryId: categoryId },
    include: {
      product: {
        include: {
          stockLots: {
            where: {
              balance: { remainingQuantity: { gt: 0 } },
              bestBeforeDate: { lte: beforeDate }
            },
            take: 1
          }
        }
      }
    },
    take: 1
  });

  return mappings.some(m => m.product.stockLots.length > 0);
}
