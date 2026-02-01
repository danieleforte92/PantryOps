import { useState, useEffect, useMemo } from 'react';
import { X, Check, Package, AlertCircle, Info, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { RecipePreviewItem, SuggestedProduct } from '../../api/client';

interface ProductSelectionModalProps {
  suggestedProducts: Record<string, SuggestedProduct[]>;
  recipeIngredients: RecipePreviewItem[];
  onConfirm: (selections: Array<{ categoryId: string; productId: string; quantity: number }>) => void;
  onCancel: () => void;
}

export default function ProductSelectionModal({
  suggestedProducts,
  recipeIngredients,
  onConfirm,
  onCancel,
}: ProductSelectionModalProps) {
  // Initialize selections with suggested quantities
  const [selections, setSelections] = useState<Record<string, { productId: string; quantity: number }>>({});
  
  // Accordion state - tutte chiuse per default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Initialize selections when modal opens
  useEffect(() => {
    const initialSelections: Record<string, { productId: string; quantity: number }> = {};
    
    recipeIngredients.forEach((ing) => {
      if (ing.suggestedProducts && ing.suggestedProducts.length > 0) {
        ing.suggestedProducts.forEach((sp) => {
          const key = `${ing.productId}-${sp.productId}`;
          initialSelections[key] = {
            productId: sp.productId,
            quantity: sp.suggestedQuantity,
          };
        });
      }
    });
    
    setSelections(initialSelections);
  }, [recipeIngredients]);

  // Calculate totals per category
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    
    recipeIngredients.forEach((ing) => {
      if (ing.suggestedProducts && ing.suggestedProducts.length > 0) {
        let total = 0;
        ing.suggestedProducts.forEach((sp) => {
          const key = `${ing.productId}-${sp.productId}`;
          const sel = selections[key];
          if (sel) {
            total += sel.quantity;
          }
        });
        totals.set(ing.productId, total);
      }
    });
    
    return totals;
  }, [selections, recipeIngredients]);

  // Check if all totals are valid (>= required)
  const isValid = useMemo(() => {
    return recipeIngredients.every((ing) => {
      if (ing.suggestedProducts && ing.suggestedProducts.length > 0) {
        const total = categoryTotals.get(ing.productId) || 0;
        return total >= ing.required;
      }
      return true;
    });
  }, [categoryTotals, recipeIngredients]);

  // Toggle category accordion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Update quantity for a product
  const updateQuantity = (categoryId: string, productId: string, delta: number) => {
    const key = `${categoryId}-${productId}`;
    const sp = suggestedProducts[categoryId]?.find((p) => p.productId === productId);
    
    if (!sp) return;
    
    setSelections((prev) => {
      const current = prev[key]?.quantity || 0;
      const newQuantity = Math.max(0, Math.min(current + delta, sp.availableQuantity));
      
      return {
        ...prev,
        [key]: {
          productId,
          quantity: newQuantity,
        },
      };
    });
  };

  // Handle confirm
  const handleConfirm = () => {
    const finalSelections: Array<{ categoryId: string; productId: string; quantity: number }> = [];
    
    recipeIngredients.forEach((ing) => {
      if (ing.suggestedProducts && ing.suggestedProducts.length > 0) {
        ing.suggestedProducts.forEach((sp) => {
          const key = `${ing.productId}-${sp.productId}`;
          const sel = selections[key];
          if (sel && sel.quantity > 0) {
            finalSelections.push({
              categoryId: ing.productId,
              productId: sp.productId,
              quantity: sel.quantity,
            });
          }
        });
      }
    });
    
    onConfirm(finalSelections);
  };

  // Get category-based ingredients only
  const categoryIngredients = recipeIngredients.filter(
    (ing) => ing.suggestedProducts && ing.suggestedProducts.length > 0
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <Card
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-surface-dark border-gray-200 dark:border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-col pb-4 border-b border-gray-100 dark:border-white/5">
          <div className="flex flex-row items-center justify-between w-full mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Package size={20} />
              </div>
              <CardTitle className="text-lg font-bold">Seleziona Prodotti</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full">
              <X size={20} />
            </Button>
          </div>
          
          {/* Help text */}
          <p className="text-sm text-text-muted flex items-start gap-2">
            <Info size={16} className="shrink-0 text-primary mt-0.5" />
            Scegli i prodotti da usare per ogni categoria. Il sistema suggerisce in base a FEFO (scadenza) e priorità.
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning if invalid */}
          {!isValid && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800">
              <AlertCircle size={20} className="text-red-400" />
              <span className="font-medium text-red-300">
                Quantità insufficiente per alcuni ingredienti. Aumenta le quantità selezionate.
              </span>
            </div>
          )}

          {/* Category sections - Accordion */}
          {categoryIngredients.map((ing) => {
            const total = categoryTotals.get(ing.productId) || 0;
            const isCategoryValid = total >= ing.required;
            const isExpanded = expandedCategories.has(ing.productId);
            
            return (
              <div key={ing.productId} className="border-b border-gray-100 dark:border-white/5">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleCategory(ing.productId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {ing.suggestedProducts?.length || 0}
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 dark:text-white">{ing.productName}</h3>
                      <p className="text-sm text-text-muted">
                        Richiesto: {ing.required} {ing.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      isCategoryValid 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {total} / {ing.required} {ing.unit}
                    </div>
                    {isExpanded ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
                  </div>
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {ing.suggestedProducts?.map((sp) => {
                      const key = `${ing.productId}-${sp.productId}`;
                      const currentQuantity = selections[key]?.quantity || 0;
                      
                      return (
                        <div
                          key={sp.productId}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            {sp.productImage ? (
                              <img
                                src={sp.productImage}
                                alt={sp.productName}
                                className="w-10 h-10 rounded-lg object-cover bg-white"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center">
                                <Package size={18} className="text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-sm text-gray-900 dark:text-white">{sp.productName}</p>
                              <div className="flex items-center gap-2 text-xs text-text-muted">
                                <span>Disponibile: {sp.availableQuantity} {sp.stockUnitName}</span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-zinc-600 font-bold">
                                  P{sp.priority}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(ing.productId, sp.productId, -10)}
                              className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors font-bold"
                              disabled={currentQuantity <= 0}
                            >
                              -
                            </button>
                            <span className="w-12 text-center font-bold text-sm">
                              {currentQuantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(ing.productId, sp.productId, 10)}
                              className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors font-bold"
                              disabled={currentQuantity >= sp.availableQuantity}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Annulla
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            <Check size={18} className="mr-2" />
            Conferma Selezione
          </Button>
        </div>
      </Card>
    </div>
  );
}
