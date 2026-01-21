import { useState } from 'react';
import { ChefHat, Check, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useConsume } from '../../hooks/useApi';

export interface CookItem {
    productId: string;
    name: string;
    imageUrl?: string;
    quantity: number;
    unit: string;
}

interface CookConfirmationModalProps {
    items: CookItem[];
    onClose: () => void;
    onSuccess?: () => void;
    title?: string;
}

export default function CookConfirmationModal({ items, onClose, onSuccess, title = "Conferma Consumo" }: CookConfirmationModalProps) {
    const consumeMutation = useConsume();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            if (onSuccess) {
                // If a success handler is provided, we assume it handles the actual API call
                // especially for unified recipe cooking.
                await (onSuccess as any)();
            } else {
                // Individual items loop (legacy/Fallback)
                for (const item of items) {
                    await consumeMutation.mutateAsync({
                        productId: item.productId,
                        quantity: item.quantity
                    });
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to process cook action:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full max-w-sm flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <ChefHat size={20} />
                        </div>
                        <CardTitle className="text-lg font-bold">{title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full" disabled={isProcessing}>
                        <X size={20} />
                    </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg flex items-start gap-3">
                        <div className="p-1 bg-amber-100 dark:bg-amber-800 rounded-full shrink-0">
                            <ChefHat size={14} className="text-amber-700 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-amber-900 dark:text-amber-200">Il magazzino verrà aggiornato</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400">Le quantità verranno scaricate automaticamente.</p>
                        </div>
                    </div>

                    <p className="text-gray-500 text-sm font-medium">Ingredienti da consumare:</p>

                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 hide-scroll">
                        {items.map((item, idx) => (
                            <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-white shadow-sm" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-gray-400">
                                        <ChefHat size={18} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                                    <p className="text-xs text-danger font-black">-{item.quantity} {item.unit}</p>
                                </div>
                                <div className="text-danger flex items-center justify-center">
                                    <ChefHat size={16} className="opacity-50" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <Button
                            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
                            onClick={handleConfirm}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="mr-2 animate-spin" />
                                    Cucino...
                                </>
                            ) : (
                                <>
                                    <Check size={18} className="mr-2" strokeWidth={3} />
                                    Conferma e Cucina
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-gray-500 font-medium"
                            onClick={onClose}
                            disabled={isProcessing}
                        >
                            Annulla
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
