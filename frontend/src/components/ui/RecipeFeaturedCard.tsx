import { Timer, Heart } from 'lucide-react';

interface RecipeFeaturedCardProps {
    title: string;
    description: string;
    matchPercentage: number;
    time: string;
    calories: number;
    missingIngredients?: string[];
    imageUrl: string;
    onClick?: () => void;
}

export function RecipeFeaturedCard({
    title,
    description,
    matchPercentage,
    time,
    calories,
    missingIngredients = [],
    imageUrl,
    onClick
}: RecipeFeaturedCardProps) {
    return (
        <div
            className="group relative flex flex-col md:flex-row bg-white dark:bg-surface-dark rounded-3xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer"
            onClick={onClick}
        >
            {/* Image Section */}
            <div className="w-full md:w-5/12 h-64 md:h-auto bg-cover bg-center relative" style={{ backgroundImage: `url("${imageUrl}")` }}>
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <div className={`h-2 w-2 rounded-full ${matchPercentage >= 90 ? 'bg-success' : 'bg-warning'}`}></div>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{matchPercentage === 100 ? 'Tutto pronto' : 'Quasi pronto'}</span>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
                        <button className="text-gray-400 hover:text-danger transition-colors">
                            <Heart size={24} />
                        </button>
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2">{description}</p>
                </div>

                <div className="flex flex-col gap-4 mt-6">
                    {/* Ingredient Match Bar */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                            <span className="text-primary">{matchPercentage}% ingredienti pronti</span>
                            <span className="text-gray-500">{missingIngredients.length > 0 ? `Manca: ${missingIngredients.join(', ')}` : 'Hai tutto!'}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${matchPercentage}%` }}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
                        <div className="flex gap-4 text-xs font-medium text-gray-500">
                            <div className="flex items-center gap-1">
                                <Timer size={16} />
                                {time}
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                                {calories} kcal
                            </div>
                        </div>
                        <button className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-primary/25 flex items-center gap-2 active:scale-95">
                            <span className="material-symbols-outlined text-[18px]">skillet</span>
                            Cucina ora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
