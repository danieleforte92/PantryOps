import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useExpiringItems, useLowStock } from '../hooks/useApi';
import { FridgeWatchPanel } from '../components/ui/FridgeWatchPanel';
import { LowStockPanel } from '../components/ui/LowStockPanel';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const navigate = useNavigate();
    const { data: expiringData } = useExpiringItems();
    const { data: lowStockData } = useLowStock();

    // Flatten all expiring items to display in the Fridge Watch panel
    const allExpiringItems = [
        ...(expiringData?.expired ?? []),
        ...(expiringData?.today ?? []),
        ...(expiringData?.thisWeek ?? []),
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
                {/* Left Column: CTA (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Puoi cucinare ora</h2>
                    </div>

                    <div className="p-12 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-white/2">
                        <span className="material-symbols-outlined text-gray-300 text-5xl mb-4">restaurant</span>
                        <h3 className="text-lg font-bold text-gray-400">Scegli cosa cucinare</h3>
                        <p className="text-sm text-gray-400">Vai alle ricette o aggiungi prodotti in dispensa.</p>
                    </div>

                    {/* Primary CTA */}
                    <div className="p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-900/40">
                        <div className="bg-primary/10 text-primary p-4 rounded-2xl shadow-sm mb-4">
                            <span className="material-symbols-outlined text-3xl">restaurant_menu</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Crea o scegli una ricetta</h3>
                        <p className="text-sm text-text-muted max-w-xs mb-4">
                            Parti da una ricetta semplice o aggiungi nuovi prodotti alla dispensa.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => navigate('/recipes')}
                                className="px-5 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30"
                            >
                                Aggiungi ricetta
                            </button>
                            <button
                                onClick={() => navigate('/scan')}
                                className="px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-semibold"
                            >
                                Scansiona prodotti
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Fridge Watch & Stats (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    <FridgeWatchPanel expiringItems={allExpiringItems} />
                    <LowStockPanel items={lowStockItems} />
                </div>
            </div>
        </div>
    );
}
