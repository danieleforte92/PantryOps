import { Package, Sparkles } from 'lucide-react';
import { useTutorialProducts, useConvertTutorial } from '../../hooks/useTutorial';
import { TutorialProductCard } from './TutorialProductCard';

export function TutorialProductsPanel() {
    const { data, isLoading } = useTutorialProducts();
    const convertMutation = useConvertTutorial();

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200 animate-pulse">
                <div className="h-32 bg-amber-100/50 rounded-xl" />
            </div>
        );
    }

    const tutorialProducts = data?.tutorialProducts || [];
    const count = data?.count || 0;

    if (count === 0) {
        return null; // Don't show if no tutorial products
    }

    const handleConvert = (lotId: string, bestBeforeDate: string) => {
        convertMutation.mutate({ lotId, bestBeforeDate });
    };

    return (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-white rounded-2xl p-5 border border-amber-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Completa la tua dispensa</h3>
                        <p className="text-sm text-slate-500">
                            {count} prodott{count === 1 ? 'o' : 'i'} da completare
                        </p>
                    </div>
                </div>
            <div className="text-right">
                <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                    Da completare
                </span>
            </div>
            </div>

            <div className="space-y-3 mb-4">
                {tutorialProducts.slice(0, 3).map((product) => (
                    <TutorialProductCard
                        key={product.lotId}
                        product={product}
                        onConvert={handleConvert}
                        isConverting={convertMutation.isPending}
                    />
                ))}
            </div>

            {tutorialProducts.length > 3 && (
                <p className="text-sm text-slate-500 text-center mb-4">
                    +{tutorialProducts.length - 3} altri prodotti...
                </p>
            )}

            <div className="bg-white/60 rounded-xl p-3 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-700 mb-1">Completa i dettagli</p>
                    <p>
                        Imposta una scadenza e una posizione per ogni prodotto tutorial.
                    </p>
                </div>
            </div>
        </div>
    );
}
