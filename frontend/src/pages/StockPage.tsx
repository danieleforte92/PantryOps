import { useCurrentStock, useConsume } from '../hooks/useApi';
import { Package, Minus, Plus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { StockStatusBadge, type StockStatus } from '../components/ui/StockStatusBadge';
import { differenceInDays, parseISO } from 'date-fns';

export default function StockPage() {
    const { data, isLoading } = useCurrentStock();
    const consumeMutation = useConsume();
    const [consumingId, setConsumingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const stockItems = useMemo(() => {
        if (!data?.stock) return [];
        return data.stock.filter(item =>
            item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    const handleConsume = async (productId: string, amount: number = 1) => {
        setConsumingId(productId);
        try {
            await consumeMutation.mutateAsync({ productId, quantity: amount });
        } catch (error) {
            console.error('Consume failed:', error);
        } finally {
            setConsumingId(null);
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
                <h1 className="text-3xl font-bold mb-2">Dispensa</h1>
                <p className="text-gray-500">{data?.stock.length || 0} prodotti disponibili</p>

                {/* Search Bar */}
                <div className="mt-6 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cerca nella dispensa..."
                        className="w-full bg-white dark:bg-zinc-800 border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary outline-none text-lg"
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
                    <h3 className="text-xl font-bold mb-2">Dispensa Vuota</h3>
                    <p className="text-gray-500">Scansiona i prodotti per riempire la tua dispensa digitale.</p>
                </div>
            ) : (
                <div className="space-y-4 px-1">
                    {stockItems.map((item) => {
                        // Mocking expiry/minStock for now as they might be on item.product or not fully returned
                        const status = getStockStatus(item.quantity, 2); // Mock minStock=2

                        return (
                            <Card key={item.productId} className="p-4 flex items-center gap-4 bg-white dark:bg-zinc-900/50 border-gray-100 dark:border-white/5">
                                {item.product.imageUrl ? (
                                    <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-white"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                                        <Package size={28} className="text-gray-400" />
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{item.product.name}</h3>
                                        <StockStatusBadge status={status} showLabel={false} className="scale-75 origin-left" />
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {item.quantity.toFixed(item.product.stockUnit.abbreviation === 'pz' ? 0 : 1)} {item.product.stockUnit.abbreviation}
                                    </p>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800 rounded-xl p-1">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400 transition-all disabled:opacity-50"
                                            onClick={() => handleConsume(item.productId, 1)}
                                            disabled={consumingId === item.productId || item.quantity <= 0}
                                        >
                                            {consumingId === item.productId ? (
                                                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                                            ) : (
                                                <Minus size={16} />
                                            )}
                                        </button>
                                        <span className="font-bold w-4 text-center text-sm">{Math.floor(item.quantity)}</span>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-primary transition-all"
                                            onClick={() => {/* TODO: Add logic */ }}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
