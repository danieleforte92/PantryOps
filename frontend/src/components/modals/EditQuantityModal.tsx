import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useUpdateShoppingQuantity } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <Card
        className="w-full max-w-sm flex flex-col bg-white dark:bg-surface-dark border-gray-200 dark:border-white/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
          <CardTitle className="text-xl">Modifica</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Product Info */}
          <div className="flex items-center gap-4">
            {item.product.imageUrl ? (
              <img src={item.product.imageUrl} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                <Save size={24} />
              </div>
            )}
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{item.product.name}</p>
              <p className="text-sm text-text-muted font-medium">{item.purchaseUnit}</p>
            </div>
          </div>

          {/* Stock Info */}
          {(item.currentStock !== undefined || item.minStock !== undefined) && (
            <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-white/5 grid grid-cols-2 gap-2">
              {item.currentStock !== undefined && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Attuale</span>
                  <span className="font-bold text-gray-900 dark:text-white">{item.currentStock}</span>
                </div>
              )}
              {item.minStock !== undefined && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">Minimo</span>
                  <span className="font-bold text-gray-900 dark:text-white">{item.minStock}</span>
                </div>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Quantità da comprare</label>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => setQuantity(Math.max(0.1, quantity - (quantity % 1 === 0 ? 1 : 0.5)))} className="h-12 w-12 p-0 rounded-xl text-lg">
                -
              </Button>
              <input
                type="number"
                className="flex-1 h-12 text-center text-xl rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                min={0.1}
                step={0.1}
              />
              <Button variant="secondary" onClick={() => setQuantity(quantity + (quantity % 1 === 0 ? 1 : 0.5))} className="h-12 w-12 p-0 rounded-xl text-lg">
                +
              </Button>
            </div>
          </div>

          <Button className="w-full h-12 text-base" onClick={handleSave} disabled={quantity < 0.1 || updateMutation.isPending} isLoading={updateMutation.isPending}>
            <Save size={18} className="mr-2" />
            Salva Modifiche
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
