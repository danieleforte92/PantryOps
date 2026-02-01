import { useState } from 'react';
import { X, Plus, Trash2, AlertCircle, CheckCircle, ChevronDown, Lightbulb } from 'lucide-react';
import { useCreateRecipe, useRecipes, useIngredientCategories } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface CreateRecipeModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

interface RecipeIngredientInput {
    ingredientCategoryId: string;
    quantity: number;
    unitId: string;
    // UI helper only
    categoryName: string;
    unitAbbreviation: string;
}

export default function CreateRecipeModal({ onClose, onSuccess }: CreateRecipeModalProps) {
    const [name, setName] = useState('');
    const [servings, setServings] = useState(4);
    const [ingredients, setIngredients] = useState<RecipeIngredientInput[]>([]);
    const [showBanner, setShowBanner] = useState(true);

    // Form state per nuovo ingrediente
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [quantity, setQuantity] = useState(100);

    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // Hooks
    const { data: categoriesData } = useIngredientCategories();
    const createRecipeMutation = useCreateRecipe();
    const refetchRecipes = useRecipes();

    const categories = categoriesData?.categories ?? [];
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);

    const addIngredient = () => {
        if (!selectedCategory) return;

        // Check duplicati
        if (ingredients.some(i => i.ingredientCategoryId === selectedCategory.id)) {
            setError('Questa categoria è già stata aggiunta. Modifica la quantità esistente.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        const newIngredient: RecipeIngredientInput = {
            ingredientCategoryId: selectedCategory.id,
            quantity,
            unitId: selectedCategory.baseUnit.id,
            categoryName: selectedCategory.name,
            unitAbbreviation: selectedCategory.baseUnit.abbreviation
        };

        setIngredients(prev => [...prev, newIngredient]);

        // Reset form
        setSelectedCategoryId('');
        setQuantity(100);
    };

    const removeIngredient = (index: number) => {
        setIngredients(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setError(null);

        // Validazione
        if (!name.trim()) {
            setError('Inserisci un nome per la ricetta');
            return;
        }
        if (ingredients.length === 0) {
            setError('Aggiungi almeno un ingrediente');
            return;
        }

        try {
            await createRecipeMutation.mutateAsync({
                name,
                servings,
                ingredients: ingredients.map(i => ({
                    ingredientCategoryId: i.ingredientCategoryId,
                    quantity: i.quantity,
                    unitId: i.unitId
                }))
                // Nota: productId è undefined, userà la logica category-based
            });

            setShowSuccess(true);
            refetchRecipes.refetch();

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 800);
        } catch (err: any) {
            console.error('Failed to create recipe:', err);
            const message = err?.message || err?.error || 'Errore durante il salvataggio';
            setError(message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-zinc-900 border-white/10 shadow-xl text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5">
                    <CardTitle className="text-xl font-bold">Nuova Ricetta</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/10">
                        <X size={20} />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-6 space-y-8">
                    {/* Success Message */}
                    {showSuccess && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/20 border border-green-800 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle size={20} className="text-green-400" />
                            <span className="font-bold text-green-300">Ricetta salvata con successo!</span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !showSuccess && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/20 border border-red-800 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="text-red-400" />
                            <span className="font-medium text-red-300">{error}</span>
                        </div>
                    )}

                    {/* Recipe Name & Servings */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome del piatto</label>
                            <input
                                type="text"
                                className="w-full px-0 py-2 border-b-2 border-white/10 bg-transparent focus:border-primary focus:outline-none text-3xl font-bold placeholder:text-zinc-700 transition-colors"
                                placeholder="es. Pasta al pomodoro"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium text-gray-400">Porzioni:</label>
                            <div className="flex items-center gap-3 bg-zinc-800 rounded-full p-1 pl-2 pr-2 border border-white/5">
                                <Button variant="ghost" size="icon" onClick={() => setServings(Math.max(1, servings - 1))} className="h-8 w-8 rounded-full hover:bg-zinc-700">
                                    -
                                </Button>
                                <span className="min-w-[3ch] text-center font-bold text-lg">{servings}</span>
                                <Button variant="ghost" size="icon" onClick={() => setServings(servings + 1)} className="h-8 w-8 rounded-full hover:bg-zinc-700">
                                    +
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Educational Banner */}
                    {showBanner && (
                        <div className="bg-blue-900/20 border border-blue-800 rounded-2xl p-4 relative animate-in fade-in slide-in-from-top-2">
                            <button 
                                onClick={() => setShowBanner(false)}
                                className="absolute top-2 right-2 text-blue-400 hover:text-blue-200 transition-colors p-1 rounded-full hover:bg-blue-900/40"
                            >
                                <X size={16} />
                            </button>
                            <div className="flex gap-3">
                                <div className="p-2 bg-blue-900/40 rounded-xl shrink-0">
                                    <Lightbulb size={20} className="text-blue-400" />
                                </div>
                                <div className="flex-1 pr-6">
                                    <p className="font-bold text-blue-300 text-sm mb-1">
                                        Ricette universali
                                    </p>
                                    <p className="text-xs text-blue-400 leading-relaxed">
                                        Le tue ricette useranno categorie (es. "Pasta", non "Barilla").
                                        Quando cucini, potrai scegliere quale marca usare.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Ingredients Section */}
                    <div className="space-y-4 p-5 bg-zinc-800/30 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-bold text-primary">Aggiungi ingredienti</label>
                            <span className="text-xs text-gray-500">{ingredients.length} aggiunti</span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Category Dropdown */}
                            <div className="flex-1 relative">
                                <select
                                    className="w-full h-12 pl-4 pr-10 rounded-xl bg-zinc-800 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer font-medium"
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                >
                                    <option value="" disabled>Scegli ingredienti categoria...</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name} ({cat.baseUnit.abbreviation})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>

                            {/* Quantity & Add Button */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-zinc-800 rounded-xl border border-white/10 h-12 px-1">
                                    <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 10))} className="h-8 w-8 rounded-lg hover:bg-zinc-700">
                                        -
                                    </Button>
                                    <input
                                        type="number"
                                        className="w-16 text-center bg-transparent border-none focus:ring-0 font-bold"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 10)} className="h-8 w-8 rounded-lg hover:bg-zinc-700">
                                        +
                                    </Button>
                                </div>

                                <Button
                                    className="h-12 px-6 bg-primary hover:bg-[#e67a30] text-black font-bold rounded-xl whitespace-nowrap"
                                    onClick={addIngredient}
                                    disabled={!selectedCategory}
                                >
                                    <Plus size={18} className="mr-1" />
                                    Aggiungi
                                </Button>
                            </div>
                        </div>

                        {selectedCategory && (
                            <p className="text-xs text-gray-500 ml-1">
                                Unità: <span className="text-gray-300">{selectedCategory.baseUnit.name}</span>
                            </p>
                        )}
                    </div>

                    {/* Ingredients List */}
                    {ingredients.length > 0 ? (
                        <div className="space-y-3">
                            {ingredients.map((ing, index) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{ing.categoryName}</p>
                                            <p className="text-sm text-gray-400 font-mono">
                                                {ing.quantity} {ing.unitAbbreviation}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeIngredient(index)}
                                        className="text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
                            <p>Nessun ingrediente aggiunto</p>
                            <p className="text-xs mt-1 text-gray-600">Seleziona una categoria sopra per iniziare</p>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 border-t border-white/5 flex gap-3 bg-zinc-900/95 backdrop-blur-sm">
                    <Button
                        variant="secondary"
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border-none h-12 text-base font-medium rounded-xl"
                        onClick={onClose}
                    >
                        Annulla
                    </Button>
                    <Button
                        className="flex-1 bg-primary hover:bg-[#e67a30] text-black font-bold h-12 text-base rounded-xl"
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
