import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useUpdateShoppingQuantity } from '../../hooks/useApi';

interface EditQuantityModalProps {
  item: {
    id: string;
    product: { name: string; imageUrl?: string };
    quantity: number;
    purchaseUnit: string;
    currentStock?: number;
    minStock?: number;
  };
  onClose: () => void;
}

export default function EditQuantityModal({ item, onClose }: EditQuantityModalProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const updateMutation = useUpdateShoppingQuantity();

  const handleSave = async () => {
    if (quantity < 0.1) return;

    try {
      await updateMutation.mutateAsync({ id: item.id, quantity });
      onClose();
    } catch (error) {
      console.error('Failed to update quantity:', error);
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
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-lg">
          <h2>Modifica quantità</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-md mb-lg">
          {item.product.imageUrl ? (
            <img
              src={item.product.imageUrl}
              alt={item.product.name}
              style={{
                width: '3rem',
                height: '3rem',
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
              }}
            />
          ) : (
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Save size={20} className="text-muted" />
            </div>
          )}
          <div>
            <p style={{ fontWeight: 500 }}>{item.product.name}</p>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              {item.purchaseUnit}
            </p>
          </div>
        </div>

        {/* Stock Info */}
        {(item.currentStock !== undefined || item.minStock !== undefined) && (
          <div className="mb-md" style={{ padding: 'var(--space-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            {item.currentStock !== undefined && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                Stock attuale: {item.currentStock}
              </p>
            )}
            {item.minStock !== undefined && (
              <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                Min stock: {item.minStock}
              </p>
            )}
          </div>
        )}

        {/* Quantity Input */}
        <div className="mb-lg">
          <label className="label">Quantità da comprare</label>
          <div className="flex items-center gap-sm">
            <button
              className="btn btn-secondary"
              onClick={() => setQuantity(Math.max(0.1, quantity - (quantity % 1 === 0 ? 1 : 0.5)))}
            >
              -
            </button>
            <input
              type="number"
              className="input text-center"
              style={{ width: '5rem' }}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              min={0.1}
              step={0.1}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setQuantity(quantity + (quantity % 1 === 0 ? 1 : 0.5))}
            >
              +
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-sm">
          <button className="btn btn-secondary flex-1" onClick={onClose}>
            Annulla
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSave}
            disabled={quantity < 0.1 || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <div className="loader" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <>
                <Save size={18} />
                Salva
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
