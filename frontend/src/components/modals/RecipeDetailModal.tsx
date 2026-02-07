import { AlertCircle, Clock, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCookRecipe, usePrefetchRecipePreview, useRecipePreview } from '../../hooks/useApi';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import CookingPreviewModal from './CookingPreviewModal';

interface Recipe {
    id: string;
    title: string;
    time: string;
    servings: number;
    imageUrl?: string;
    tags?: string[];
    description?: string;
}

interface RecipeDetailModalProps {
    recipe: Recipe;
    onClose: () => void;
}

export default function RecipeDetailModal({ recipe, onClose }: RecipeDetailModalProps) {
    const servings = recipe.servings || 1;
    const { data: preview, isLoading, isError, error } = useRecipePreview(recipe.id, servings);
    const prefetchPreview = usePrefetchRecipePreview();
    const { mutateAsync: cookRecipe } = useCookRecipe();

    const [showPreview, setShowPreview] = useState(false);
    const [isCooking, setIsCooking] = useState(false);
    const [cookError, setCookError] = useState<string | null>(null);

    const previewErrorMessage = useMemo(() => {
        if (!isError) return null;
        return (error as Error)?.message || 'Anteprima non disponibile.';
    }, [isError, error]);

    const openPreview = async () => {
        await prefetchPreview(recipe.id, servings);
        setCookError(null);
        setShowPreview(true);
    };

    const handleCook = async () => {
        setCookError(null);
        setIsCooking(true);
        try {
            await cookRecipe({ recipeId: recipe.id, servings });
            setShowPreview(false);
            onClose();
        } catch {
            setCookError('Lo stock e cambiato. Aggiorna l anteprima e riprova.');
        } finally {
            setIsCooking(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
            <Card
                className="w-full sm:max-w-2xl flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-b-none sm:rounded-2xl"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="relative h-64 shrink-0">
                    {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover rounded-t-2xl" />
                    ) : (
                        <div className="w-full h-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                            <span className="text-4xl">🍳</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md">
                        <X size={24} />
                    </Button>

                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {recipe.tags?.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-md">{tag}</Badge>
                            ))}
                            {preview?.canCook ? (
                                <Badge variant="success" className="shadow-lg backdrop-blur-md border-none">Coperta</Badge>
                            ) : (
                                <Badge variant="warning" className="shadow-lg backdrop-blur-md border-none">Copertura parziale</Badge>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md">
                            {recipe.title}
                        </h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Preparazione</h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {recipe.description || 'Ricetta pronta per la preview di consumo.'}
                        </p>
                    </div>

                    {previewErrorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{previewErrorMessage}</span>
                        </div>
                    )}

                    {!previewErrorMessage && preview && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
                            {preview.explanation}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 shrink-0 sm:rounded-b-2xl space-y-2">
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={openPreview}
                            disabled={isLoading || !!previewErrorMessage}
                        >
                            Anteprima consumo
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={openPreview}
                            disabled={isLoading || !!previewErrorMessage || !preview?.canCook}
                        >
                            Cucina ora
                        </Button>
                    </div>
                    <p className="text-xs text-center text-gray-400">
                        L anteprima non modifica lo stock.
                    </p>
                </div>
            </Card>

            {showPreview && preview && (
                <CookingPreviewModal
                    recipeTitle={recipe.title}
                    preview={preview}
                    isCooking={isCooking}
                    cookError={cookError}
                    onClose={() => setShowPreview(false)}
                    onCook={handleCook}
                />
            )}
        </div>
    );
}
