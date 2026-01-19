import { useState } from 'react';
import { X, Save, Plus, Minus, AlertTriangle, AlertCircle } from 'lucide-react';
import { usePurchase, useConsume } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface EditStockItemModalProps {
    item: {
        productId: string;
        product: {
            name: string;
            imageUrl?: string;
            purchaseUnit: { abbreviation: string };
            stockUnit: { abbreviation: string };
        };
        quantity: number;
    };
    onClose: () => void;
}

export default function EditStockItemModal({ item, onClose }: EditStockItemModalProps) {
    const [quantity, setQuantity] = useState(item.quantity);
    const purchaseMutation = usePurchase();
    const consumeMutation = useConsume();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [adjustmentReason, setAdjustmentReason] = useState<string | null>(null);

    const handleSave = async () => {
        if (quantity === item.quantity) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        try {
            const diff = quantity - item.quantity;
            if (diff > 0) {
                // Add (Purchase)
                await purchaseMutation.mutateAsync({
                    productId: item.productId,
                    quantity: diff,
                });
            } else {
                // Remove (Consume)
                await consumeMutation.mutateAsync({
                    productId: item.productId,
                    quantity: Math.abs(diff),
                });
            }
            onClose();
        } catch (error) {
            console.error('Failed to update stock:', error);
        } finally {
            setIsSubmitting(false);
        }
    };


    const diff = quantity - item.quantity;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full max-w-sm flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/50 rounded-t-2xl">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <AlertCircle size={20} className="text-gray-400" />
                        Rettifica Inventario
                    </CardTitle>
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
                            <p className="text-sm text-gray-500 font-medium">
                                Attuale: {item.quantity} {item.product.stockUnit?.abbreviation}
                            </p>
                        </div>
                    </div>

                    {/* Quantity Control */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Quantità in Dispensa</label>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                                className="h-12 w-12 p-0 rounded-xl text-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                            >
                                <Minus size={20} />
                            </Button>
                            <div className="flex-1 h-12 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-white/10 relative">
                                <input
                                    type="number"
                                    className="w-full text-center text-xl bg-transparent border-none focus:ring-0 font-bold"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                                    min={0}
                                />
                                {diff !== 0 && (
                                    <span className={`absolute right-3 text-xs font-bold ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {diff > 0 ? '+' : ''}{diff}
                                    </span>
                                )}
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => setQuantity(quantity + 1)}
                                className="h-12 w-12 p-0 rounded-xl text-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600"
                            >
                                <Plus size={20} />
                            </Button>
                        </div>
                    </div>

                    {/* Adjustment Reasons (UX Contract) */}
                    {diff < 0 && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Motivo della rettifica</label>
                            <div className="flex flex-wrap gap-2">
                                {['Errore Inventario', 'Scaduto', 'Buttato / Perso', 'Altro'].map(reason => (
                                    <button
                                        key={reason}
                                        onClick={() => setAdjustmentReason(reason)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${adjustmentReason === reason
                                            ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-400'
                                            : 'bg-white dark:bg-zinc-800 border-gray-100 dark:border-white/5 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-white/2 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
                                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-gray-500 leading-tight">Nota: Questa operazione non verrà conteggiata come utilizzo in cucina.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex pt-2">
                        <Button
                            className="flex-1 text-base h-12 font-bold shadow-lg shadow-primary/10"
                            onClick={handleSave}
                            disabled={isSubmitting || quantity === item.quantity}
                            isLoading={isSubmitting}
                        >
                            <Save size={18} className="mr-2" />
                            Salva Rettifica
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
