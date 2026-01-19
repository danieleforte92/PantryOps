import { Link } from 'react-router-dom';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import type { LowStockItem } from '../../api/client';
import { Badge } from './Badge';

interface LowStockPanelProps {
    items: LowStockItem[];
}

export function LowStockPanel({ items }: LowStockPanelProps) {
    return (
        <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 border border-gray-200 dark:border-white/5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
                        <ShoppingCart size={20} className="icon-filled" />
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Low Stock</h3>
                </div>
                <Link to="/shopping" className="text-xs font-bold text-gray-500 hover:text-primary transition-colors">Go to Shopping</Link>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto hide-scroll max-h-[300px]">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">All stocks are healthy! 🥗</div>
                ) : (
                    items.map((item) => (
                        <div key={item.product.id} className="flex items-center p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 transition-all hover:bg-gray-100 dark:hover:bg-white/10 group">
                            <div className="h-10 w-10 bg-white dark:bg-zinc-800 rounded-xl p-1 mr-3 flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-white/10">
                                {item.product.imageUrl ? (
                                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                                )}
                            </div>

                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.product.name}</span>
                                    {/* Tiny Health Badges */}
                                    <div className="flex gap-1 items-center scale-75 origin-left shrink-0">
                                        {item.product.nutriscore && (
                                            <div className={`text-[8px] font-black px-1 py-0.5 rounded ${item.product.nutriscore === 'A' ? 'bg-green-600' :
                                                    item.product.nutriscore === 'B' ? 'bg-green-500' :
                                                        item.product.nutriscore === 'C' ? 'bg-yellow-500' :
                                                            item.product.nutriscore === 'D' ? 'bg-orange-500' : 'bg-red-500'
                                                } text-white uppercase`}>
                                                {item.product.nutriscore}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-danger font-bold">{item.current} {item.product.unit}</span>
                                    <span className="text-[10px] text-gray-500 font-medium">min: {item.minimum}</span>
                                </div>
                            </div>

                            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 group-hover:bg-secondary group-hover:text-white transition-all">
                                +{item.needed}
                            </Badge>
                        </div>
                    ))
                )}
            </div>

            {items.length > 0 && (
                <div className="mt-6 flex items-center gap-3 p-3 bg-secondary/5 border border-secondary/10 rounded-2xl">
                    <AlertCircle className="text-secondary w-5 h-5 flex-shrink-0" />
                    <p className="text-[10px] font-medium text-secondary leading-tight">
                        Suggested: {items.length} items to be added to your shopping list.
                    </p>
                </div>
            )}
        </div>
    );
}
