import { Check, X, Clock, Users, Lightbulb } from 'lucide-react';
import { useRecipePreview, useCookRecipe } from '../../hooks/useApi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useState } from 'react';
import CookConfirmationModal from './CookConfirmationModal';
import ProductSelectionModal from './ProductSelectionModal';
import type { ProductSelection } from '../../api/client';

interface Recipe {
    id: string;
    title: string;
    time: string;
    servings: number;
    imageUrl?: string;
    tags?: string[];
    // Mocking extended details for now
    description?: string;
    ingredients?: { name: string; quantity: string }[];
}

interface RecipeDetailModalProps {
    recipe: Recipe;
    onClose: () => void;
}

// MOCK_INGREDIENTS removed as they are now handled by the backend preview endpoint.

export default function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
    const [servings] = useState(recipe.servings || 1);
    const { data: preview, isLoading } = useRecipePreview(recipe.id, servings);
    const { mutateAsync: cookRecipe } = useCookRecipe();
    const [cooking, setCooking] = useState(false);
    const [showProductSelection, setShowProductSelection] = useState(false);
    const [productSelections, setProductSelections] = useState<ProductSelection[]>([]);

    // Check if recipe has category-based ingredients
    const hasCategoryIngredients = preview?.ingredients.some((ing: any) => ing.suggestedProducts && ing.suggestedProducts.length > 0);

    const handleStartCooking = () => {
        if (hasCategoryIngredients) {
            setShowProductSelection(true);
        } else {
            setCooking(true);
        }
    };

    const handleProductSelectionConfirm = (selections: ProductSelection[]) => {
        setProductSelections(selections);
        setShowProductSelection(false);
        setCooking(true);
    };

    const confirmCook = async () => {
        await cookRecipe({ recipeId: recipe.id, servings, productSelections });
    };

    if (isLoading) return null; // Or skeleton

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full sm:max-w-2xl flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-b-none sm:rounded-2xl animate-slide-up sm:animate-in sm:zoom-in-95"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header Image */}
                <div className="relative h-64 shrink-0">
                    {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover rounded-t-2xl" />
                    ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                            <span className="text-4xl">🍳</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md"
                    >
                        <X size={24} />
                    </Button>

                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {recipe.tags?.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md">{tag}</Badge>
                            ))}
                            {preview?.canCook ? (
                                <Badge variant="success" className="shadow-lg backdrop-blur-md border-none">Tutto in dispensa!</Badge>
                            ) : (
                                <Badge variant="warning" className="shadow-lg backdrop-blur-md border-none">Mancano ingredienti</Badge>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md">
                            {recipe.title || (recipe as any).name}
                        </h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8">
                        {/* Meta */}
                        <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <Clock className="text-primary" size={20} />
                                <span className="font-medium">{recipe.time} preparazione</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="text-primary" size={20} />
                                <span className="font-medium">{recipe.servings} persone</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Preparazione</h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {recipe.description || "Ecco una ricetta deliziosa preparata apposta per te. Segui i passaggi con cura e buon appetito!"}
                            </p>
                        </div>

                        {/* Ingredients */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ingredienti</h3>
                            <div className="space-y-4">
                                {preview?.ingredients.map((ing: any) => {
                                    const hasSuggestedProducts = ing.suggestedProducts && ing.suggestedProducts.length > 0;
                                    const categoryProducts = ing.suggestedProducts || [];
                                    
                                    return (
                                        <div key={ing.productId} className="space-y-2">
                                            {/* Header ingrediente con stato */}
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                                        ${ing.missing === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
                                                    `}>
                                                        {ing.missing === 0 ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{ing.productName}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Richiesto: {ing.required} {ing.unit}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* Badge scadenza se category-based e disponibile */}
                                                {hasSuggestedProducts && ing.missing === 0 && (
                                                    <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                                                        Scade tra 14 giorni
                                                    </span>
                                                )}
                                            </div>

                                            {/* Piano FEFO per category-based */}
                                            {hasSuggestedProducts && ing.missing === 0 && (
                                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                                                    <p className="text-xs font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                                        <Lightbulb size={14} />
                                                        Pianificato per te (FEFO):
                                                    </p>
                                                    
                                                    <div className="space-y-2">
                                                        {categoryProducts
                                                            .filter((sp: any) => sp.suggestedQuantity > 0)
                                                            .map((sp: any) => {
                                                                const daysUntilExpiry = sp.bestBeforeDate 
                                                                    ? Math.ceil((new Date(sp.bestBeforeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                                                    : null;
                                                                
                                                                const expiryText = daysUntilExpiry 
                                                                    ? daysUntilExpiry <= 3 
                                                                        ? `Scade tra ${daysUntilExpiry} giorni`
                                                                        : daysUntilExpiry <= 30 
                                                                            ? `Scade tra ${daysUntilExpiry} giorni`
                                                                            : 'Nessuna scadenza'
                                                                    : 'Nessuna scadenza';
                                                                
                                                                const expiryClass = daysUntilExpiry && daysUntilExpiry <= 3 
                                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                                    : daysUntilExpiry && daysUntilExpiry <= 30 
                                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
                                                                
                                                                return (
                                                                    <div key={sp.productId} className="flex items-center justify-between text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-900 dark:text-white font-medium">{sp.productName}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-500 dark:text-gray-400">
                                                                                {sp.suggestedQuantity} {sp.stockUnitName}
                                                                            </span>
                                                                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${expiryClass}`}>
                                                                                {expiryText}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0 sm:rounded-b-2xl">
                    <Button
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
                        onClick={handleStartCooking}
                        disabled={!preview?.canCook}
                    >
                        Cucina ora
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-2">
                        Attenzione: questa azione consumerà le scorte dal magazzino
                    </p>
                </div>

                {/* Product Selection Modal */}
                {showProductSelection && preview && (
                    <ProductSelectionModal
                        suggestedProducts={preview.ingredients.reduce((acc: any, ing: any) => {
                            if (ing.suggestedProducts) {
                                acc[ing.productId] = ing.suggestedProducts;
                            }
                            return acc;
                        }, {})}
                        recipeIngredients={preview.ingredients}
                        onConfirm={handleProductSelectionConfirm}
                        onCancel={() => setShowProductSelection(false)}
                    />
                )}

                {/* Cook Confirmation Modal Integration */}
                {cooking && (
                    <CookConfirmationModal
                        items={preview?.ingredients.map((i: any) => ({
                            productId: i.productId,
                            name: i.productName,
                            quantity: i.required,
                            unit: i.unit,
                        })) || []}
                        onClose={() => setCooking(false)}
                        onSuccess={confirmCook}
                        title={`Cucina: ${recipe.title}`}
                    />
                )}
            </Card>
        </div>
    );
}
