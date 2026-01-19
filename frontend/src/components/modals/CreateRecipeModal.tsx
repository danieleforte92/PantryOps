import { useState } from 'react';
import { X, Plus, Search, Package, Trash2 } from 'lucide-react';
import { useProducts, useCreateRecipe, useRecipes } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface CreateRecipeModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

interface RecipeIngredientInput {
    productId: string;
    quantity: number;
    unitId: string;
}

export default function CreateRecipeModal({ onClose, onSuccess }: CreateRecipeModalProps) {
    const [name, setName] = useState('');
    const [servings, setServings] = useState(4);
    const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([]);
    const [search, setSearch] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(100);

    const { data: productsData } = useProducts();
    const createRecipeMutation = useCreateRecipe();
    const refetchRecipes = useRecipes();

    const products = productsData?.products ?? [];
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const selectedProduct = products.find(p => p.id === selectedProductId);

    const addIngredient = () => {
        if (!selectedProduct) return;

        const newIngredient: RecipeIngredientInput = {
            productId: selectedProduct.id,
            quantity,
            unitId: selectedProduct.stockUnit.id
        };

        setIngredients(prev => [...prev, newIngredient]);
        setSelectedProductId('');
        setQuantity(100);
        setSearch('');
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!name || ingredients.length === 0) return;

        try {
            await createRecipeMutation.mutateAsync({
                name,
                servings,
                ingredients
            });
            refetchRecipes.refetch();
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Failed to create recipe:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
                    <CardTitle className="text-xl">Nuova Ricetta</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X size={20} />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-6">
                    {/* Recipe Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome ricetta</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold text-lg"
                            placeholder="es. Pasta al pomodoro"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Servings */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Porzioni</label>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={() => setServings(Math.max(1, servings - 1))} className="h-10 w-10 p-0 rounded-xl">
                                -
                            </Button>
                            <input
                                type="number"
                                className="flex-1 h-10 text-center rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 font-bold"
                                value={servings}
                                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                            />
                            <Button variant="secondary" onClick={() => setServings(servings + 1)} className="h-10 w-10 p-0 rounded-xl">
                                +
                            </Button>
                        </div>
                    </div>

                    {/* Add Ingredients Section */}
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Aggiungi ingredienti</label>
                            <span className="text-xs text-gray-500">{ingredients.length} ingredienti</span>
                        </div>

                        {/* Search Products */}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Cerca prodotto..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Product List */}
                        {search && (
                            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${selectedProductId === product.id
                                            ? 'bg-primary/5 border-primary/30'
                                            : 'bg-white dark:bg-zinc-900 border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800'
                                            }`}
                                        onClick={() => setSelectedProductId(product.id)}
                                    >
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                                <Package size={18} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{product.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {product.stockUnit.abbreviation}
                                            </p>
                                        </div>
                                        {selectedProductId === product.id && (
                                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity Input & Add Button */}
                        {selectedProduct && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex-1 flex items-center gap-2">
                                    <Button variant="secondary" onClick={() => setQuantity(Math.max(1, quantity - 10))} className="h-9 w-9 p-0 rounded-lg">
                                        -
                                    </Button>
                                    <input
                                        type="number"
                                        className="flex-1 h-9 text-center rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 font-bold"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        min={1}
                                    />
                                    <Button variant="secondary" onClick={() => setQuantity(quantity + 10)} className="h-9 w-9 p-0 rounded-lg">
                                        +
                                    </Button>
                                    <span className="text-sm font-bold text-gray-500 w-12 text-center">
                                        {selectedProduct.stockUnit.abbreviation}
                                    </span>
                                </div>
                                <Button size="sm" onClick={addIngredient}>
                                    <Plus size={16} className="mr-1" />
                                    Aggiungi
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Ingredients List */}
                    {ingredients.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Ingredienti selezionati</label>
                            <div className="space-y-2">
                                {ingredients.map((ing, index) => {
                                    const product = products.find(p => p.id === ing.productId);
                                    const unit = products.find(p => p.id === ing.productId)?.stockUnit;
                                    return (
                                        <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{product?.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {ing.quantity} {unit?.abbreviation}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="h-8 w-8 text-red-500 hover:text-red-600">
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose}>Annulla</Button>
                    <Button 
                        className="flex-1" 
                        onClick={handleSubmit} 
                        disabled={!name || ingredients.length === 0 || createRecipeMutation.isPending}
                        isLoading={createRecipeMutation.isPending}
                    >
                        {createRecipeMutation.isPending ? 'Salvataggio...' : 'Salva ricetta'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
