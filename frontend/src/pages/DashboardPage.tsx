import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useExpiringItems, useLowStock, useTodaySuggestions } from '../hooks/useApi';
import { RecipeFeaturedCard } from '../components/ui/RecipeFeaturedCard';
import { FridgeWatchPanel } from '../components/ui/FridgeWatchPanel';
import { LowStockPanel } from '../components/ui/LowStockPanel';
import { GamificationWidget } from '../components/gamification';
import RecipeDetailModal from '../components/modals/RecipeDetailModal';
import { useState } from 'react';
export default function DashboardPage() {
    const { data: expiringData } = useExpiringItems();
    const { data: lowStockData } = useLowStock();
    const { data: suggestions } = useTodaySuggestions();
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

    // Get the first suggestion as the featured recipe
    const topSuggestion = suggestions?.[0];

    const featuredRecipe = topSuggestion ? {
        id: topSuggestion.id,
        title: topSuggestion.title,
        description: topSuggestion.usesExpiringItems
            ? "Ottimale per consumare prodotti in scadenza e ridurre gli sprechi."
            : "Una ricetta bilanciata basata sulla tua dispensa attuale.",
        matchPercentage: topSuggestion.matchPercentage,
        time: "25 min", // Mocked as per "no cooking times in DB" rule
        calories: 450, // Mocked
        missingIngredients: topSuggestion.missingIngredientsCount > 0
            ? [`${topSuggestion.missingIngredientsCount} ingredienti mancanti`]
            : [],
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600" // Decent fallback
    } : null;

    // Flatten all expiring items to display in the Fridge Watch panel
    const allExpiringItems = [
        ...(expiringData?.expired ?? []),
        ...(expiringData?.today ?? []),
        ...(expiringData?.thisWeek ?? [])
    ];

    // Calculate count of items expiring within 48 hours (Today + Tomorrow approx)
    const expiringCount = (expiringData?.expired?.length ?? 0) + (expiringData?.today?.length ?? 0);
    const lowStockItems = lowStockData?.lowStock ?? [];

    return (
        <div className="flex flex-col gap-10">
            {/* Header / Date Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">Oggi</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {format(new Date(), 'EEEE, d MMM', { locale: it })}
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">In base a quello che hai in casa</p>
                </div>

                {expiringCount > 0 && (
                    <div className="flex items-center gap-2 text-gray-500 bg-white dark:bg-surface-dark px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-white/5">
                        <span className="material-symbols-outlined text-warning">warning</span>
                        <span className="font-medium text-sm">Hai <span className="text-gray-900 dark:text-white font-bold">{expiringCount} ingredienti</span> in scadenza</span>
                    </div>
                )}
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column: Suggested Recipes (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Puoi cucinare ora</h2>
                        <button className="text-primary text-sm font-bold hover:underline">Vedi tutte le combinazioni</button>
                    </div>

                    {featuredRecipe ? (
                        <RecipeFeaturedCard
                            {...featuredRecipe}
                            onClick={() => setSelectedRecipe(featuredRecipe)}
                        />
                    ) : (
                        <div className="p-12 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-white/2">
                            <span className="material-symbols-outlined text-gray-300 text-5xl mb-4">restaurant</span>
                            <h3 className="text-lg font-bold text-gray-400">Nessun suggerimento per oggi</h3>
                            <p className="text-sm text-gray-400">Aggiungi più prodotti o ricette per vedere i consigli.</p>
                        </div>
                    )}

                    {/* Secondary Suggestions Grid Placeholder - Data pending backend AI */}
                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-white/2">
                        <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm mb-4">
                            <span className="material-symbols-outlined text-gray-400 text-3xl">Auto_Awesome</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Altre idee in arrivo</h3>
                        <p className="text-sm text-text-muted max-w-xs">Stiamo elaborando nuovi suggerimenti basati sulla tua dispensa aggiornata.</p>
                    </div>
                </div>

                {/* Right Column: Fridge Watch & Stats (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <FridgeWatchPanel expiringItems={allExpiringItems} />

                    <LowStockPanel items={lowStockItems} />

                    {/* Gamification Widget */}
                    <GamificationWidget />
                </div>
            </div>

            {selectedRecipe && (
                <RecipeDetailModal
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                />
            )}
        </div>
    );
}
