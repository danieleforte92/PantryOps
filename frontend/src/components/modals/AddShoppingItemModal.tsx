import { useState, useEffect } from 'react';
import { X, Plus, Search, Package } from 'lucide-react';
import { useProducts, useAddShoppingItem } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface AddShoppingItemModalProps {
  onClose: () => void;
}

export default function AddShoppingItemModal({ onClose }: AddShoppingItemModalProps) {
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { data: productsData } = useProducts();
  const addMutation = useAddShoppingItem();

  const products = productsData?.products ?? [];
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct && selectedProduct.minStockAmount) {
      const current = selectedProduct.currentStock?.quantity ?? 0;
      const needed = Math.max(1, Math.ceil((selectedProduct.minStockAmount - current) / selectedProduct.purchaseToStockFactor));
      setQuantity(needed);
    }
  }, [selectedProductId, selectedProduct]);

  const handleAdd = async () => {
    if (!selectedProductId) return;

    try {
      await addMutation.mutateAsync({ productId: selectedProductId, quantity });
      onClose();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <Card
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-surface-dark border-gray-200 dark:border-white/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
          <CardTitle className="text-xl">Aggiungi alla lista</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Cerca prodotto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Product List */}
          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${selectedProductId === product.id
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-white dark:bg-zinc-800/20 border-transparent hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                onClick={() => setSelectedProductId(product.id)}
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Package size={18} className="text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{product.name}</p>
                  {product.currentStock && (
                    <p className="text-xs text-text-muted">
                      Stock: {product.currentStock.quantity} {product.stockUnit.abbreviation}
                    </p>
                  )}
                </div>

                {selectedProductId === product.id && (
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-white/5">
              <p className="font-bold text-sm text-gray-900 dark:text-white">
                Selezionato: <span className="text-primary">{selectedProduct.name}</span>
              </p>
              {selectedProduct.minStockAmount && (
                <p className="text-xs text-text-muted mt-1">
                  Scorta minima: {selectedProduct.minStockAmount} {selectedProduct.stockUnit.abbreviation}
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Quantità</label>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-10 w-10 p-0 rounded-xl">
                -
              </Button>
              <input
                type="number"
                className="flex-1 h-10 text-center rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 font-bold"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
              />
              <Button variant="secondary" onClick={() => setQuantity(quantity + 1)} className="h-10 w-10 p-0 rounded-xl">
                +
              </Button>
              <span className="text-sm font-bold text-text-muted w-12 text-center">
                {selectedProduct?.purchaseUnit.abbreviation || 'pz'}
              </span>
            </div>
          </div>
        </CardContent>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button className="flex-1" onClick={handleAdd} disabled={!selectedProductId || addMutation.isPending} isLoading={addMutation.isPending}>
            <Plus size={18} className="mr-2" />
            Aggiungi
          </Button>
        </div>
      </Card>
    </div>
  );
}
