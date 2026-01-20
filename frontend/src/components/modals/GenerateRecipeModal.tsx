import { useState, useMemo } from 'react';
import { X, Sparkles, Check, Search, ChefHat } from 'lucide-react';
import { useCurrentStock } from '../../hooks/useApi';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface GenerateRecipeModalProps {
    onClose: () => void;
    onGenerate: (selectedIngredients: string[]) => void;
}

export default function GenerateRecipeModal({ onClose, onGenerate }: GenerateRecipeModalProps) {
    const { data, isLoading } = useCurrentStock();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Filter stock items
    const stockItems = useMemo(() => {
        if (!data?.stock) return [];
        return data.stock.filter(item =>
            item.productId && // Ensure valid item
            item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleGenerate = () => {
        if (selectedIds.size === 0) return;
        setIsGenerating(true);
        // Simulate API call delay
        setTimeout(() => {
            const ingredients = stockItems
                .filter(item => selectedIds.has(item.productId))
                .map(item => item.product.name);
            onGenerate(ingredients);
            setIsGenerating(false);
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
            <Card
                className="w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 shadow-2xl max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/50 rounded-t-2xl">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Sparkles className="text-primary" size={24} />
                            Chef AI
                        </CardTitle>
                        <p className="text-sm text-gray-500">Seleziona gli ingredienti da usare</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X size={20} />
                    </Button>
                </CardHeader>

                <div className="p-4 border-b border-gray-100 dark:border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cerca nella dispensa..."
                            className="w-full bg-gray-100 dark:bg-zinc-800 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <CardContent className="flex-1 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-gray-400 text-sm">Caricamento dispensa...</p>
                        </div>
                    ) : stockItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <ChefHat size={32} />
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">Nessun ingrediente trovato</p>
                            <p className="text-sm text-gray-500 mt-1">Prova a scansionare qualche prodotto prima.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {stockItems.map(item => {
                                const isSelected = selectedIds.has(item.productId);
                                return (
                                    <div
                                        key={item.productId}
                                        onClick={() => toggleSelection(item.productId)}
                                        className={`
                                    relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none
                                    ${isSelected
                                                ? 'bg-primary/5 border-primary ring-1 ring-primary dark:bg-primary/10'
                                                : 'bg-white dark:bg-zinc-800/50 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-800'
                                            }
                                `}
                                    >
                                        {item.product.imageUrl ? (
                                            <img src={item.product.imageUrl} alt={item.product.name} className="w-10 h-10 rounded-lg object-cover bg-white" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-gray-400">
                                                {item.product.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 dark:text-gray-200 truncate">{item.product.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.quantity} {item.product.stockUnit?.abbreviation}
                                            </p>
                                        </div>
                                        <div className={`
                                    w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                    ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'}
                                `}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-zinc-900 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-3 text-sm text-gray-500">
                        <span>{selectedIds.size} selezionati</span>
                        {selectedIds.size > 0 && (
                            <button onClick={() => setSelectedIds(new Set())} className="text-primary hover:underline">
                                Deseleziona tutti
                            </button>
                        )}
                    </div>
                    <Button
                        className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
                        onClick={handleGenerate}
                        disabled={selectedIds.size === 0 || isGenerating}
                        isLoading={isGenerating}
                    >
                        {isGenerating ? 'Sto creando la magia...' : 'Genera Ricetta'}
                        {!isGenerating && <Sparkles size={20} className="ml-2" />}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
