import { Card, CardContent } from './Card';
import { Badge } from './Badge';
import { ChefHat, Timer } from 'lucide-react';

interface RecipeCardProps {
    title: string;
    matchPercentage: number;
    time: string;
    imageUrl?: string;
    missingIngredients?: number;
}

export function RecipeCard({ title, matchPercentage, time, imageUrl, missingIngredients = 0 }: RecipeCardProps) {
    return (
        <Card className="overflow-hidden group hover:border-primary/50 transition-all cursor-pointer bg-white/5 border-white/10">
            <div className="relative h-32 w-full overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                        <ChefHat className="text-gray-300 dark:text-zinc-600" size={32} />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <Badge variant={matchPercentage > 80 ? 'success' : 'warning'} className="backdrop-blur-md bg-opacity-90">
                        {matchPercentage}% Match
                    </Badge>
                </div>
            </div>
            <CardContent className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">{title}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Timer size={14} />
                        <span>{time}</span>
                    </div>
                    {missingIngredients > 0 ? (
                        <span className="text-orange-500 font-medium">Mancano {missingIngredients} ingr.</span>
                    ) : (
                        <span className="text-green-500 font-medium">Hai tutto!</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
