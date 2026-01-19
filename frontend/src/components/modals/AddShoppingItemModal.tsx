import { useState, useEffect } from 'react';
import { X, Plus, Search, Package } from 'lucide-react';
import { useProducts, useAddShoppingItem } from '../../hooks/useApi';

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-md)',
      }}
      onClick={onClose}
    >
      <div
        className="card animate-fadeIn"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-lg">
          <h2>Aggiungi alla lista</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="mb-md">
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              className="text-muted"
              style={{
                position: 'absolute',
                left: 'var(--space-md)',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Cerca prodotto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
              autoFocus
            />
          </div>
        </div>

        {/* Product List */}
        <div className="mb-md" style={{ maxHeight: '200px', overflow: 'auto' }}>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-md mb-sm p-sm cursor-pointer"
              style={{
                padding: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                background: selectedProductId === product.id ? 'var(--color-surface)' : undefined,
                border: selectedProductId === product.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedProductId(product.id)}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={14} className="text-muted" />
                </div>
              )}
              <div className="flex-1">
                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{product.name}</p>
                {product.currentStock && (
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    Stock: {product.currentStock.quantity} {product.stockUnit.abbreviation}
                  </p>
                )}
              </div>
              {selectedProductId === product.id && (
                <div
                  style={{
                    width: '1rem',
                    height: '1rem',
                    borderRadius: '50%',
                    background: 'var(--color-accent)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Selected Product Details */}
        {selectedProduct && (
          <div className="mb-md" style={{ padding: 'var(--space-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
              Selezionato: {selectedProduct.name}
            </p>
            {selectedProduct.minStockAmount && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                Min stock: {selectedProduct.minStockAmount} {selectedProduct.stockUnit.abbreviation}
              </p>
            )}
          </div>
        )}

        {/* Quantity */}
        <div className="mb-lg">
          <label className="label">Quantità</label>
          <div className="flex items-center gap-sm">
            <button
              className="btn btn-secondary"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              -
            </button>
            <input
              type="number"
              className="input text-center"
              style={{ width: '5rem' }}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
            <span className="text-muted">
              {selectedProduct?.purchaseUnit.abbreviation || ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-sm">
          <button className="btn btn-secondary flex-1" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleAdd}
            disabled={!selectedProductId || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <div className="loader" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <>
                <Plus size={18} />
                Aggiungi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
