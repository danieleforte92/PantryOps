import { useState } from 'react';
import { Package, Check, X, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '../ui/Button';
import { TutorialProduct } from '../../api/client';

interface TutorialProductCardProps {
    product: TutorialProduct;
    onConvert: (lotId: string, bestBeforeDate: string) => void;
    isConverting: boolean;
}

export function TutorialProductCard({ product, onConvert, isConverting }: TutorialProductCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [bestBeforeDate, setBestBeforeDate] = useState('');

    const handleSubmit = () => {
        if (!bestBeforeDate) return;
        onConvert(product.lotId, bestBeforeDate);
        setIsEditing(false);
    };

    // Calculate default date (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const defaultDateString = defaultDate.toISOString().split('T')[0];

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{product.name}</h4>
                    <p className="text-sm text-slate-500">
                        {product.quantity} {product.unit} • {product.location}
                    </p>
                </div>
                <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                    Tutorial
                </span>
            </div>

            {!isEditing ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsEditing(true)}
                >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Aggiungi scadenza
                </Button>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Data di scadenza
                        </label>
                        <input
                            type="date"
                            value={bestBeforeDate}
                            onChange={(e) => setBestBeforeDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            placeholder="Seleziona data"
                        />
                        {!bestBeforeDate && (
                            <button
                                onClick={() => setBestBeforeDate(defaultDateString)}
                                className="text-xs text-primary mt-1 hover:underline"
                            >
                                Suggerisci: {format(defaultDate, 'd MMM yyyy', { locale: it })}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setIsEditing(false)}
                            disabled={isConverting}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Annulla
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleSubmit}
                            isLoading={isConverting}
                            disabled={!bestBeforeDate || isConverting}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Conferma
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
