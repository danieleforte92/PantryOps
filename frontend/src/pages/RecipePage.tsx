import { useState } from 'react';
import { ChefHat, Sparkles, Clock, Users, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import GenerateRecipeModal from '../components/modals/GenerateRecipeModal';
import RecipeDetailModal from '../components/modals/RecipeDetailModal';
import CreateRecipeModal from '../components/modals/CreateRecipeModal';

export default function RecipePage() {
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null); // In real app: Recipe type

    const [recipes, setRecipes] = useState<{
        id: string;
        title: string;
        time: string;
        servings: number;
        missingIngredients: number;
        imageUrl?: string;
        tags?: string[];
    }[]>([
        // Mock Data
        { id: '1', title: 'Pasta al Pomodoro', time: '15m', servings: 2, missingIngredients: 0, imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&q=80&w=300', tags: ['Vegetariana', 'Veloce'] },
        { id: '2', title: 'Risotto ai Funghi', time: '35m', servings: 4, missingIngredients: 2, imageUrl: 'https://images.unsplash.com/photo-1626804475297-411dbe6314c3?auto=format&fit=crop&q=80&w=300', tags: ['Classico'] },
    ]);

    const handleRecipeGenerated = (ingredients: string[]) => {
        // Mock: Add a new recipe based on ingredients
        const newRecipe = {
            id: Date.now().toString(),
            title: `Piatto con ${ingredients[0]} e...`, // Simulating AI title
            time: '25m',
            servings: 2,
            missingIngredients: 0,
            imageUrl: undefined, // Placeholder
            tags: ['AI Chef', 'Nuovo']
        };
        setRecipes(prev => [newRecipe, ...prev]);
    };

    const handleRecipeCreated = () => {
        // Refresh recipes after creation
        // This will be replaced with actual refetch when useRecipes is integrated
        console.log('Recipe created successfully');
    };

    return (
        <div className="animate-fade-in pb-24 space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ricette</h1>
                    <p className="text-gray-500 font-medium">Idee per cucinare cene perfette</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="rounded-xl" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} className="mr-2" />
                        Nuova
                    </Button>
                    <Button className="rounded-xl shadow-primary/25" onClick={() => setShowGenerateModal(true)}>
                        <Sparkles size={18} className="mr-2" />
                        Genera
                    </Button>
                </div>
            </header>

            {/* Categories / Filters (Mock) */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scroll">
                {['Tutte', 'Veloci (15m)', 'Vegetariane', 'Con quello che ho'].map((cat, i) => (
                    <button
                        key={cat}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${i === 0
                            ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                            : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Recipe List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map(recipe => (
                    <Card
                        key={recipe.id}
                        className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-zinc-900"
                        onClick={() => setSelectedRecipe(recipe)}
                    >
                        <div className="relative h-48">
                            {recipe.imageUrl ? (
                                <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <ChefHat size={48} className="text-gray-300" />
                                </div>
                            )}
                            <div className="absolute top-3 left-3 flex gap-2">
                                {recipe.missingIngredients === 0 ? (
                                    <Badge variant="success" className="shadow-lg backdrop-blur-md">Puoi cucinarlo!</Badge>
                                ) : (
                                    <Badge variant="warning" className="shadow-lg backdrop-blur-md">Mancano {recipe.missingIngredients} ingredienti</Badge>
                                )}
                            </div>
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors leading-tight">{recipe.title}</h3>
                                {recipe.tags && (
                                    <div className="flex gap-1">
                                        {recipe.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-[10px] font-bold text-gray-500 uppercase">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Clock size={16} />
                                    <span>{recipe.time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users size={16} />
                                    <span>{recipe.servings} pp</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {/* Upsell Card */}
                <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2 border-gray-200 dark:border-zinc-800 bg-transparent min-h-[300px] text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Sparkles size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Non sai cosa cucinare?</h3>
                        <p className="text-gray-500 text-sm max-w-[200px] mx-auto mt-1">Chiedi all'AI di generare una ricetta con ciò che hai in frigo.</p>
                    </div>
                    <Button variant="secondary" className="mt-2" onClick={() => setShowGenerateModal(true)}>Prova ora</Button>
                </Card>
            </div>

            {/* Generate Modal */}
            {showGenerateModal && (
                <GenerateRecipeModal
                    onClose={() => setShowGenerateModal(false)}
                    onGenerate={handleRecipeGenerated}
                />
            )}

            {/* Create Recipe Modal */}
            {showCreateModal && (
                <CreateRecipeModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleRecipeCreated}
                />
            )}

            {/* Detail Modal */}
            {selectedRecipe && (
                <RecipeDetailModal
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                />
            )}
        </div>
    );
}
