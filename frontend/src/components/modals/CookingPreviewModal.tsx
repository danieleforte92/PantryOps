import { AlertCircle, CheckCircle2, Clock3, X, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import type { RecipePreview, RecipePreviewItem } from '../../api/client';

interface CookingPreviewModalProps {
    recipeTitle: string;
    preview: RecipePreview;
    isCooking: boolean;
    cookError: string | null;
    onClose: () => void;
    onCook: () => Promise<void>;
}

function getExpiryLabel(daysToExpiry: number | null) {
    if (daysToExpiry === null) return { text: 'Nessuna scadenza', className: 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-gray-200' };
    if (daysToExpiry < 0) return { text: 'Scaduto', className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' };
    if (daysToExpiry === 0) return { text: 'Scade oggi', className: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' };
    return { text: `Scade tra ${daysToExpiry} giorni`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' };
}

function StatusBadge({ item }: { item: RecipePreviewItem }) {
    if (item.status === 'covered') {
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">Coperto</span>;
    }
    if (item.status === 'partial') {
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">Parzialmente coperto</span>;
    }
    return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">Non disponibile</span>;
}

export default function CookingPreviewModal({
    recipeTitle,
    preview,
    isCooking,
    cookError,
    onClose,
    onCook,
}: CookingPreviewModalProps) {
    const coverageIcon = preview.coverageStatus === 'covered'
        ? <CheckCircle2 size={18} className="text-green-500" />
        : preview.coverageStatus === 'partial'
            ? <Clock3 size={18} className="text-amber-500" />
            : <XCircle size={18} className="text-red-500" />;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="pb-4 border-b border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl text-gray-900 dark:text-white">Anteprima consumo</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">{recipeTitle}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                            <X size={18} />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 overflow-y-auto space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <AlertCircle size={16} className="text-blue-600 dark:text-blue-300 mt-0.5" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">{preview.explanation}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                        {coverageIcon}
                        <span>Stato copertura: {preview.coverageStatus}</span>
                    </div>

                    {cookError && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                            {cookError}
                        </div>
                    )}

                    <div className="space-y-3">
                        {preview.ingredients.map((ing, index) => (
                            <div key={`${ing.ingredientCategoryId}-${index}`} className="border border-gray-100 dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-zinc-800/40">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">{ing.ingredientName}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Richiesto {ing.required} {ing.unit} • Disponibile {ing.available} {ing.unit}
                                        </p>
                                        {ing.missing > 0 && (
                                            <p className="text-sm text-red-600 dark:text-red-300">Mancano {ing.missing} {ing.unit}</p>
                                        )}
                                    </div>
                                    <StatusBadge item={ing} />
                                </div>

                                {ing.suggestedProducts && ing.suggestedProducts.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {ing.suggestedProducts.map((sp) => {
                                            const expiry = getExpiryLabel(sp.daysToExpiry);
                                            return (
                                                <div key={sp.productId} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/10 rounded-lg px-3 py-2">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{sp.productName}</p>
                                                        <p className="text-xs text-gray-500">{sp.reason}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-700 dark:text-gray-300">{sp.suggestedQuantity} {sp.stockUnitName}</span>
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${expiry.className}`}>{expiry.text}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isCooking}>
                        Annulla
                    </Button>
                    <Button className="flex-1" onClick={onCook} isLoading={isCooking} disabled={!preview.canCook || isCooking}>
                        Cucina ora
                    </Button>
                </div>
            </Card>
        </div>
    );
}
