import { useState } from 'react';
import { ChefHat, Sparkles, Clock, Users, Plus, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import GenerateRecipeModal from '../components/modals/GenerateRecipeModal';
import RecipeDetailModal from '../components/modals/RecipeDetailModal';
import CreateRecipeModal from '../components/modals/CreateRecipeModal';
import { LockAIRecipeCard } from '../components/gamification';
import { useAIStatus } from '../hooks/useGamification';
import { useRecipes } from '../hooks/useApi';

export default function RecipePage() {
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
    const { data: aiStatus } = useAIStatus();

    // Real API data instead of mock
    const { data: recipesData, isLoading, isError, refetch } = useRecipes();
    const recipes = (recipesData ?? []).map((r: any) => ({
        id: r.id,
        title: r.name,
        time: r.prepTime || '?',
        servings: r.servings || 4,
        missingIngredients: 0, // TODO: Calculate from suggestions
        imageUrl: r.imageUrl,
        tags: r.tags || []
    }));

    const handleRecipeGenerated = (ingredients: string[]) => {
        // TODO: When AI is implemented, use mutation
        console.log('AI Recipe generated with:', ingredients);
        refetch();
    };

    const handleRecipeCreated = () => {
        // Refresh recipes after creation
        refetch();
    };

    const aiUnlocked = aiStatus?.unlocked ?? false;

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
                    {aiUnlocked ? (
                        <Button className="rounded-xl shadow-primary/25" onClick={() => setShowGenerateModal(true)}>
                            <Sparkles size={18} className="mr-2" />
                            Genera
                        </Button>
                    ) : (
                        <Button
                            className="rounded-xl shadow-primary/25 opacity-50 cursor-not-allowed"
                            disabled
                            title="Sblocca a 500 punti"
                        >
                            <Lock size={18} className="mr-2" />
                            Genera
                        </Button>
                    )}
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

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-primary" />
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle size={48} className="text-red-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Errore nel caricamento</h3>
                    <p className="text-gray-500 text-sm mb-4">Non siamo riusciti a caricare le ricette.</p>
                    <Button variant="secondary" onClick={() => refetch()}>Riprova</Button>
                </div>
            )}

            {/* Recipe List */}
            {!isLoading && !isError && (
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
                                            {recipe.tags.slice(0, 2).map((tag: string) => (
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

                    {/* Empty State */}
                    {recipes.length === 0 && (
                        <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2 border-gray-200 dark:border-zinc-800 bg-transparent min-h-[300px] text-center space-y-4 col-span-full">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                                <ChefHat size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Nessuna ricetta</h3>
                                <p className="text-gray-500 text-sm max-w-[200px] mx-auto mt-1">Crea la tua prima ricetta per iniziare!</p>
                            </div>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus size={18} className="mr-2" />
                                Crea ricetta
                            </Button>
                        </Card>
                    )}

                    {/* Upsell Card - only show if there are recipes */}
                    {recipes.length > 0 && (
                        aiUnlocked ? (
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
                        ) : (
                            <LockAIRecipeCard />
                        )
                    )}
                </div>
            )}

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
