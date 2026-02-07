import { useState, useEffect } from 'react';
import { X, ChevronRight, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { SwipeableProductCard } from './SwipeableProductCard';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/useApi';

interface TutorialProduct {
    name: string;
    defaultCategory: string;
    defaultQuantity: number;
    unitName: string;
    emoji: string;
}

const PRODUCT_EMOJIS: Record<string, string> = {
    'Pasta': 'ðŸ',
    'Pomodori pelati': 'ðŸ¥«',
    'Olio extravergine': 'ðŸ«’',
    'Pane': 'ðŸž',
    'Latte': 'ðŸ¥›',
    'Uova': 'ðŸ¥š',
    'Formaggio': 'ðŸ§€',
    'Pollo': 'ðŸ—',
};

interface OnboardingWizardProps {
    isOpen: boolean;
    onComplete: () => void;
}

export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(0);
    const [products, setProducts] = useState<TutorialProduct[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, household } = useAuth();

    useEffect(() => {
        if (isOpen && step === 1) {
            fetchTutorialProducts();
        }
    }, [isOpen, step]);

    const fetchTutorialProducts = async () => {
        try {
            const response = await api.get<{ products: TutorialProduct[] }>('/onboarding/tutorial-products');
            const productsWithEmoji = response.products.map((p: TutorialProduct) => ({
                ...p,
                emoji: PRODUCT_EMOJIS[p.name] || 'ðŸ“¦',
            }));
            setProducts(productsWithEmoji);
        } catch (err) {
            console.error('Failed to fetch tutorial products:', err);
        }
    };

    const handleConfirmProduct = (productName: string) => {
        setSelectedProducts(prev => new Set([...prev, productName]));
    };

    const handleDiscardProduct = (productName: string) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            newSet.delete(productName);
            return newSet;
        });
    };

    const handleSetupProducts = async () => {
        if (!user?.id || !household?.id) return;

        setIsLoading(true);
        setError(null);

        try {
            const selectedProductsArray = Array.from(selectedProducts).map(name => ({
                name,
                confirmed: true,
            }));

            await api.post('/onboarding/setup-products', {
                householdId: household.id,
                userId: user.id,
                selectedProducts: selectedProductsArray,
            });

            setStep(2);
        } catch (err) {
            console.error('Failed to setup products:', err);
            setError('Errore durante l\'aggiunta dei prodotti. Riprova.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!user?.id) return;

        try {
            await api.post('/onboarding/skip', { userId: user.id });
            onComplete();
        } catch (err) {
            console.error('Failed to skip onboarding:', err);
        }
    };

    const handleComplete = async () => {
        if (!user?.id) return;

        try {
            await api.patch('/onboarding/progress', {
                userId: user.id,
                step: 4,
            });
            onComplete();
        } catch (err) {
            console.error('Failed to complete onboarding:', err);
        }
    };

    if (!isOpen) return null;

    const renderStep0 = () => (
        <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-primary-dark rounded-3xl flex items-center justify-center shadow-xl shadow-primary/30">
                <ChefHat className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
                Benvenuto su PantryOps!
            </h2>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
                Organizza la tua dispensa, riduci gli sprechi e scopri cosa cucinare con cio che hai gia a casa.
            </p>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-xl">ðŸ“¦</span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-800">Gestisci la dispensa</p>
                        <p className="text-sm text-slate-500">Traccia scadenze e stock</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-xl">ðŸ³</span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-800">Ricette semplici</p>
                        <p className="text-sm text-slate-500">Idee per usare quello che hai</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl">ðŸŒ±</span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-slate-800">Zero sprechi</p>
                        <p className="text-sm text-slate-500">Rispetta FEFO, risparmia denaro</p>
                    </div>
                </div>
            </div>

            <Button size="lg" className="w-full" onClick={() => setStep(1)}>
                Iniziamo!
                <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            <button
                onClick={handleSkip}
                className="mt-4 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
                Salta per ora
            </button>
        </div>
    );

    const renderStep1 = () => (
        <div className="py-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">
                        La tua dispensa iniziale
                    </h2>
                    <p className="text-sm text-slate-500">
                        Seleziona cosa hai gia in casa
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                        {selectedProducts.size}/{products.length}
                    </p>
                    <p className="text-xs text-slate-400">prodotti</p>
                </div>
            </div>

            <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {products.map((product, index) => (
                    <SwipeableProductCard
                        key={product.name}
                        name={product.name}
                        category={product.defaultCategory}
                        defaultQuantity={product.defaultQuantity}
                        unit={product.unitName}
                        emoji={product.emoji}
                        isConfirmed={selectedProducts.has(product.name)}
                        onConfirm={() => handleConfirmProduct(product.name)}
                        onDiscard={() => handleDiscardProduct(product.name)}
                        isActive={
                            index === 0 ||
                            selectedProducts.has(products[index - 1]?.name) ||
                            !selectedProducts.has(product.name)
                        }
                    />
                ))}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="mt-6 flex gap-3">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(0)}
                    disabled={isLoading}
                >
                    Indietro
                </Button>
                <Button
                    className="flex-1"
                    onClick={handleSetupProducts}
                    isLoading={isLoading}
                    disabled={selectedProducts.size === 0 || isLoading}
                >
                    Conferma ({selectedProducts.size})
                    <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl flex items-center justify-center shadow-xl shadow-green/30">
                <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
                Ottimo lavoro!
            </h2>
            <p className="text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
                Hai aggiunto <span className="font-semibold text-primary">{selectedProducts.size}</span> prodotti alla tua dispensa.
                Ora puoi iniziare ad usare PantryOps!
            </p>

            <Button size="lg" className="w-full" onClick={handleComplete}>
                Vai alla dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${
                                        i <= step ? 'bg-primary' : 'bg-slate-200'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 0 && renderStep0()}
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                </div>
            </div>
        </div>
    );
}
