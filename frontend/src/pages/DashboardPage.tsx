import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth, useExpiringItems } from '../hooks/useApi';
import { RecipeFeaturedCard } from '../components/ui/RecipeFeaturedCard';
import { FridgeWatchPanel } from '../components/ui/FridgeWatchPanel';
// import { RecipeCard } from '../components/ui/RecipeCard'; // Keeping this as secondary card if needed, but focusing on Feature Card first.

export default function DashboardPage() {
    const { user } = useAuth();
    const { data: expiringData } = useExpiringItems();

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

    const secondaryRecipes = [
        {
            title: "Avocado & Spinach Salad",
            description: "Fresh and healthy salad.",
            matchPercentage: 100,
            time: "10 mins • Raw",
            calories: 120,
            missingIngredients: [],
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCKFSxaJ18Rre0nI4LYlmHhYEdMUQoWw3oF7uyU-EUzqtfkwbBWkB8toNyBTVMo-Ytsgw1L08TGqGfX2IIlxypuCAgGoU498zFTp2TrqelZm7VLy7DcyHpS_MxSH2WB8-Dli1qM5lHNWF3M3v7xFTMOhQ4slgdAkBI4l-QoXrLn8SJ2MC-jfd9PVxv14KRhuUmtJBcn1L9lVY9U4_92nVq_NGwARHAJJGjmX06tuFYrvGsQh1cT0VEeJpsZw3u5AOB0OXWsCi7Saw"
        },
        {
            title: "Coconut Curry Chicken",
            description: "Spicy and creamy curry.",
            matchPercentage: 85,
            time: "45 mins • Spicy",
            calories: 550,
            missingIngredients: ["Coconut Milk"],
            imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxFWj8oQmz8qvHzt3ABGQ28KU5dyLzu3n-n7o5smzoY50861z_FpSZ0Xq5DPcbaEf2OgpvsicOmOZ687v-aQWkDoXKeTMbCPeuf_yWphi_4uHcqNnoUv9QSbAI8IXqfBlUyFM77xdZOy7Ki63iXB_Nj6RdGX20qvvp1pRfljnqZBzE3auSkP9iNz6-xXVh6bI82NKslqJDv3aV6fNRuz9_uIyblt5ZznKY3KPk07MM1G_RnWL1F3aTrA41WUTTbFJa6IOZR2l1sA"
        }
    ];

    // Flatten all expiring items to display in the Fridge Watch panel
    const allExpiringItems = [
        ...(expiringData?.expired ?? []),
        ...(expiringData?.today ?? []),
        ...(expiringData?.thisWeek ?? [])
    ];

    // Calculate count of items expiring within 48 hours (Today + Tomorrow approx)
    const expiringCount = (expiringData?.expired?.length ?? 0) + (expiringData?.today?.length ?? 0);

    return (
        <div className="flex flex-col gap-10">
            {/* Header / Date Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider rounded-full">Today's Focus</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {format(new Date(), 'EEEE, d MMM', { locale: it })}
                    </h1>
                </div>

                {expiringCount > 0 && (
                    <div className="flex items-center gap-2 text-gray-500 bg-white dark:bg-surface-dark px-4 py-2 rounded-xl shadow-sm border border-gray-200 dark:border-white/5">
                        <span className="material-symbols-outlined text-warning">warning</span>
                        <span className="font-medium text-sm">You have <span className="text-gray-900 dark:text-white font-bold">{expiringCount} items</span> expiring soon</span>
                    </div>
                )}
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column: Suggested Recipes (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Suggested for today</h2>
                        <button className="text-primary text-sm font-bold hover:underline">View all matches</button>
                    </div>

                    <RecipeFeaturedCard {...featuredRecipe} />

                    {/* Secondary Suggestions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {secondaryRecipes.map((recipe, idx) => (
                            <div key={idx} className="flex flex-col bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden hover:shadow-md transition-all duration-300 group">
                                <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url("${recipe.imageUrl}")` }}>
                                    <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-sm">
                                        <span className={recipe.matchPercentage === 100 ? 'text-success' : 'text-primary'}>{recipe.matchPercentage}% Match</span>
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col gap-3 flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{recipe.title}</h3>
                                    {/* Mock Tags */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                                            {recipe.matchPercentage === 100 ? 'USE SOON' : 'PANTRY STAPLES'}
                                        </span>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between">
                                        <span className="text-xs text-gray-500 font-medium">{recipe.time}</span>
                                        <button className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Fridge Watch & Stats (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-8">
                    <FridgeWatchPanel expiringItems={allExpiringItems} />

                    {/* Quick Stats */}
                    <div className="bg-primary text-white rounded-3xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>

                        <h3 className="font-bold text-lg mb-1 relative z-10">Weekly Savings</h3>
                        <p className="text-primary-100 text-sm mb-6 relative z-10">You've saved 4 meals from waste this week!</p>

                        <div className="flex justify-between items-end relative z-10">
                            <div className="flex flex-col">
                                <span className="text-3xl font-black">€24.50</span>
                                <span className="text-xs text-white/80">Estimated value</span>
                            </div>
                            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <span className="material-symbols-outlined">trending_up</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
