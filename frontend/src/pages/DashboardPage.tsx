import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useExpiringItems, useLowStock } from '../hooks/useApi';
import { RecipeFeaturedCard } from '../components/ui/RecipeFeaturedCard';
import { FridgeWatchPanel } from '../components/ui/FridgeWatchPanel';
import { LowStockPanel } from '../components/ui/LowStockPanel';
import RecipeDetailModal from '../components/modals/RecipeDetailModal';
import { useState } from 'react';
export default function DashboardPage() {
    const { data: expiringData } = useExpiringItems();
    const { data: lowStockData } = useLowStock();
    const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

    // Mock Recipe Data tailored to PantryPal example
    const featuredRecipe = {
        title: "Roasted Tomato Basil Soup",
        description: "A comforting, classic soup made with vine-ripened tomatoes and fresh basil. Perfect for using up those soft tomatoes.",
        matchPercentage: 90,
        time: "20 min",
        calories: 350,
        missingIngredients: ["Cream"],
        imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDKw2NGL81A4U9dQARPmHNyN1DXUwHpFNWT91cos9jU6TwJOtA03fworuYeP3rZ61gD6p9eE7F6iLnAU39hZmZXRWgYJbLSHPwHSgrLnkgIFh852Dy2_U217ublg6mAAJRln7RO8hXzEmihqQaNRqsJXtECTzFKJi39FsXU-h0q2iXwnvVElLHA8QDsh7P9FoAZIeJZBnwsFAkFy7kfOYCLoUUpQXvJbG8DCmd9CfFJzq4qMzqROOlSH9pBVkbpWBm2-Zu5Dt_Zg"
    };

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

                    <RecipeFeaturedCard
                        {...featuredRecipe}
                        onClick={() => setSelectedRecipe(featuredRecipe)}
                    />

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

                    {/* Quick Stats */}
                    <div className="bg-primary text-white rounded-3xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                        <h3 className="font-bold text-lg mb-1 relative z-10">Idee alternative</h3>
                        <p className="text-primary-100 text-sm mb-6 relative z-10">Hai salvato 4 pasti dallo spreco questa settimana!</p>

                        <div className="flex justify-between items-end relative z-10">
                            <div className="flex flex-col">
                                <span className="text-3xl font-black">€24.50</span>
                                <span className="text-xs text-white/80">Valore salvato</span>
                            </div>
                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                        </div>
                    </div>
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
