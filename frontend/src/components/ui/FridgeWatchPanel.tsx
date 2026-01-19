import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Search } from 'lucide-react';
import type { ExpiringItem } from '../../api/client';

interface FridgeWatchPanelProps {
    expiringItems: ExpiringItem[];
}

export function FridgeWatchPanel({ expiringItems }: FridgeWatchPanelProps) {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="bg-danger/10 text-danger p-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[20px] icon-filled">notification_important</span>
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Da usare presto</h3>
                </div>
                <Link to="/stock" className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">Vedi tutto</Link>
            </div>

            <div className="flex flex-col gap-3 flex-1">
                {expiringItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Tutto sotto controllo! 🎉</div>
                ) : (
                    expiringItems.slice(0, 3).map((item, idx) => {
                        const isExpired = new Date(item.bestBeforeDate) < new Date();
                        const colorClass = idx === 0 ? 'bg-danger' : idx === 1 ? 'bg-warning' : 'bg-gray-300 dark:bg-gray-600';
                        const bgClass = idx === 0 ? 'bg-danger/20 border-danger/20' : idx === 1 ? 'bg-warning/20 border-warning/20' : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5';
                        const textClass = idx === 0 ? 'text-danger' : idx === 1 ? 'text-warning' : 'text-gray-500';

                        return (
                            <div key={item.lotId} className={`flex items-center p-3 rounded-2xl border ${bgClass} relative overflow-hidden group transition-all hovered`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorClass}`}></div>

                                <div className="h-10 w-10 bg-white rounded-xl p-1 mr-3 flex-shrink-0 flex items-center justify-center">
                                    {item.product.imageUrl ? (
                                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                                    )}
                                </div>

                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product.name}</span>
                                    <span className={`text-xs font-medium ${textClass}`}>
                                        {isExpired ? 'Scaduto' : format(new Date(item.bestBeforeDate), 'd MMM', { locale: it })}
                                    </span>
                                </div>

                                <button className="text-gray-400 hover:text-primary hover:bg-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Search size={20} />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="w-full mt-4 py-3 rounded-xl border-2 border-primary text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                Trova ricetta
            </button>
        </div>
    );
}
