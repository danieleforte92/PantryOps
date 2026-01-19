import { Check, X, Clock, Users, ShoppingCart } from 'lucide-react';
import { useCurrentStock, useAddShoppingItem } from '../../hooks/useApi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useMemo, useState } from 'react';
import CookConfirmationModal, { CookItem } from './CookConfirmationModal';

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

// Mock ingredients for the demo since our recipe list was light on data
const MOCK_INGREDIENTS: Record<string, { name: string; quantity: string }[]> = {
    '1': [ // Pasta al Pomodoro
        { name: 'Pasta', quantity: '200g' },
        { name: 'Passata di Pomodoro', quantity: '300g' },
        { name: 'Olio EVO', quantity: 'qb' },
        { name: 'Basilico', quantity: 'fork' }
    ],
    '2': [ // Risotto
        { name: 'Riso Carnaroli', quantity: '300g' },
        { name: 'Funghi Porcini', quantity: '200g' },
        { name: 'Brodo Vegetale', quantity: '1L' },
        { name: 'Burro', quantity: '50g' }
    ]
};

export default function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
    const { data: stockData } = useCurrentStock();
    const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
    const [cookingItems, setCookingItems] = useState<CookItem[] | null>(null);

    const ingredients = useMemo(() => {
        return recipe.ingredients || MOCK_INGREDIENTS[recipe.id] || [
            { name: 'Ingrediente misterioso', quantity: '1' },
            { name: 'Amore', quantity: 'tanto' }
        ];
    }, [recipe]);

    const ingredientsStatus = useMemo(() => {
        if (!stockData?.stock) return ingredients.map(i => ({ ...i, inStock: false }));

        return ingredients.map(ing => {
            // Simple name matching for MVP
            const stockItem = stockData.stock.find(s =>
                s.product.name.toLowerCase().includes(ing.name.toLowerCase()) ||
                ing.name.toLowerCase().includes(s.product.name.toLowerCase())
            );
            return {
                ...ing,
                inStock: !!stockItem && stockItem.quantity > 0,
                stockQuantity: stockItem?.quantity,
                stockUnit: stockItem?.product.stockUnit.abbreviation
            };
        });
    }, [ingredients, stockData]);

    const handleAddToShoppingList = async (ingredientName: string) => {
        // For MVP we just assume we can add by name -> creating a mock product ID would be complex here
        // In a real app we'd search for the product ID first.
        // For now, we'll just toggle the visual state to show interaction
        setAddedItems(prev => new Set(prev).add(ingredientName));
    };

    const missingCount = ingredientsStatus.filter(i => !i.inStock).length;

    const handleStartCooking = () => {
        const toCook: CookItem[] = ingredientsStatus
            .filter(ing => ing.inStock)
            .map(ing => {
                // Find actual stock item again to get ID and correct unit
                const stockItem = stockData?.stock.find(s =>
                    s.product.name.toLowerCase().includes(ing.name.toLowerCase()) ||
                    ing.name.toLowerCase().includes(s.product.name.toLowerCase())
                );

                return {
                    productId: stockItem!.productId,
                    name: stockItem!.product.name,
                    imageUrl: stockItem!.product.imageUrl,
                    quantity: 1, // Defaulting to 1 unit for simplified MVP cooking
                    unit: stockItem!.product.stockUnit.abbreviation
                };
            });

        if (toCook.length > 0) {
            setCookingItems(toCook);
        }
    };

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
                            {missingCount === 0 ? (
                                <Badge variant="success" className="shadow-lg backdrop-blur-md border-none">Tutto in dispensa!</Badge>
                            ) : (
                                <Badge variant="warning" className="shadow-lg backdrop-blur-md border-none">Mancano {missingCount} ingredienti</Badge>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md">{recipe.title}</h2>
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
                            <div className="space-y-3">
                                {ingredientsStatus.map((ing, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                        ${ing.inStock ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}
                                    `}>
                                                {ing.inStock ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{ing.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    Richiesto: {ing.quantity}
                                                    {ing.inStock && ` • Hai: ${ing.stockQuantity} ${ing.stockUnit}`}
                                                </p>
                                            </div>
                                        </div>

                                        {!ing.inStock && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAddToShoppingList(ing.name)}
                                                disabled={addedItems.has(ing.name)}
                                                className={`h-9 px-3 ${addedItems.has(ing.name) ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
                                            >
                                                {addedItems.has(ing.name) ? <Check size={16} /> : <ShoppingCart size={16} />}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0 sm:rounded-b-2xl">
                    <Button
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
                        onClick={handleStartCooking}
                        disabled={ingredientsStatus.filter(i => i.inStock).length === 0}
                    >
                        Cucina ora
                    </Button>
                </div>

                {/* Cook Confirmation Modal */}
                {cookingItems && (
                    <CookConfirmationModal
                        items={cookingItems}
                        onClose={() => setCookingItems(null)}
                        onSuccess={() => onClose()}
                        title={`Cucina: ${recipe.title}`}
                    />
                )}
            </Card>
        </div>
    );
}
