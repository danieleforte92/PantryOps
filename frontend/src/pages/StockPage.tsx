import { useCurrentStock, useConsume, usePurchase } from '../hooks/useApi';
import { StockItem } from '../api/client';
import { Package, Minus, Plus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { StockStatusBadge, type StockStatus } from '../components/ui/StockStatusBadge';
import { differenceInDays, parseISO } from 'date-fns';
import EditStockItemModal from '../components/modals/EditStockItemModal';
import CookConfirmationModal, { CookItem } from '../components/modals/CookConfirmationModal';

export default function StockPage() {
    const { data, isLoading } = useCurrentStock();
    const consumeMutation = useConsume();
    const purchaseMutation = usePurchase();

    // Track loading states locally to avoid UI jitter using mutation.isPending which is global
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [cookingItems, setCookingItems] = useState<CookItem[] | null>(null);

    const stockItems = useMemo(() => {
        if (!data?.stock) return [];
        return data.stock.filter(item =>
            item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const handleConsumeTrigger = (e: React.MouseEvent, item: StockItem) => {
        e.stopPropagation();
        setCookingItems([{
            productId: item.productId,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            quantity: 1,
            unit: item.product.stockUnit.abbreviation
        }]);
    };

    const handleIncrement = async (e: React.MouseEvent, productId: string) => {
        e.stopPropagation();
        setProcessingId(`add-${productId}`);
        try {
            await purchaseMutation.mutateAsync({
                productId,
                quantity: 1,
                // We don't specify location/date here for quick increment, backend presumably uses default
            });
        } catch (error) {
            console.error('Increment failed:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const getStockStatus = (quantity: number, minStock?: number, expiryDate?: string): StockStatus => {
        if (expiryDate) {
            const daysToExpiry = differenceInDays(parseISO(expiryDate), new Date());
            if (daysToExpiry < 0) return 'expired';
            if (daysToExpiry <= 3) return 'expiring';
        }
        // Simple low stock logic, can be enhanced
        if (minStock && quantity <= minStock) return 'low';
        return 'good';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-24">
            <header className="mb-8 p-6 bg-gradient-to-br from-background-light to-white dark:from-background-dark dark:to-zinc-900 rounded-3xl border border-white/5 shadow-sm">
                <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Dispensa</h1>
                <p className="text-gray-500">{data?.stock.length || 0} prodotti disponibili</p>

                {/* Search Bar */}
                <div className="mt-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cerca nella dispensa..."
                        className="w-full bg-white dark:bg-zinc-800 border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary outline-none text-lg text-gray-900 dark:text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {!data?.stock.length ? (
                <div className="text-center py-20 px-6">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Dispensa Vuota</h3>
                    <p className="text-gray-500">Scansiona i prodotti per riempire la tua dispensa digitale.</p>
                </div>
            ) : (
                <div className="space-y-4 px-1">
                    {stockItems.map((item) => {
                        // Mocking expiry/minStock for now as they might be on item.product or not fully returned
                        const status = getStockStatus(item.quantity, 2); // Mock minStock=2

                        return (
                            <Card
                                key={item.productId}
                                className="p-4 flex items-center gap-4 bg-white dark:bg-zinc-900/50 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                                onClick={() => setEditingItem(item)}
                            >
                                {item.product.imageUrl ? (
                                    <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-white"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                        <Package size={28} />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{item.product.name}</h3>
                                        <StockStatusBadge status={status} showLabel={false} className="scale-75 origin-left" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm text-gray-500 font-medium">
                                            {item.quantity.toFixed(item.product.stockUnit.abbreviation === 'pz' ? 0 : 1)} {item.product.stockUnit.abbreviation}
                                        </p>

                                        {/* Inline mini health badges */}
                                        <div className="flex gap-1.5 items-center">
                                            {item.product.nutriscore && (
                                                <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.product.nutriscore === 'A' ? 'bg-green-600' :
                                                    item.product.nutriscore === 'B' ? 'bg-green-500' :
                                                        item.product.nutriscore === 'C' ? 'bg-yellow-500' :
                                                            item.product.nutriscore === 'D' ? 'bg-orange-500' : 'bg-red-500'
                                                    } text-white uppercase`}>
                                                    {item.product.nutriscore}
                                                </div>
                                            )}
                                            {item.product.novaGroup && (
                                                <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.product.novaGroup === 1 ? 'bg-green-600' :
                                                    item.product.novaGroup === 2 ? 'bg-yellow-500' :
                                                        item.product.novaGroup === 3 ? 'bg-orange-500' : 'bg-red-500'
                                                    } text-white`}>
                                                    N{item.product.novaGroup}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 rounded-xl p-1" onClick={e => e.stopPropagation()}>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400 transition-all disabled:opacity-50"
                                            onClick={(e) => handleConsumeTrigger(e, item)}
                                            title="Cucina o Usa questo prodotto"
                                            disabled={processingId === `consume-${item.productId}` || item.quantity <= 0}
                                        >
                                            {processingId === `consume-${item.productId}` ? (
                                                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                                            ) : (
                                                <Minus size={16} />
                                            )}
                                        </button>

                                        <span className="font-bold w-6 text-center text-sm text-gray-900 dark:text-white">
                                            {Math.floor(item.quantity)}
                                        </span>

                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-primary transition-all disabled:opacity-50"
                                            onClick={(e) => handleIncrement(e, item.productId)}
                                            disabled={processingId === `add-${item.productId}`}
                                        >
                                            {processingId === `add-${item.productId}` ? (
                                                <div className="w-4 h-4 border-2 border-primary border-t-primary-dark rounded-full animate-spin" />
                                            ) : (
                                                <Plus size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Edit Modal */}
            {editingItem && (
                <EditStockItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                />
            )}

            {/* Cook Confirmation Modal */}
            {cookingItems && (
                <CookConfirmationModal
                    items={cookingItems}
                    onClose={() => setCookingItems(null)}
                />
            )}
        </div>
    );
}
