import { Package } from 'lucide-react';
import { Card } from './Card';
import type { ScanResult } from '../../api/client';

interface LastScannedDrawerProps {
    scannedItems: ScanResult[];
    onItemClick: (item: ScanResult) => void;
}

export function LastScannedDrawer({ scannedItems, onItemClick }: LastScannedDrawerProps) {
    if (scannedItems.length === 0) return null;

    return (
        <div className="absolute inset-x-0 bottom-0 z-10 p-6 pointer-events-none">
            <div className="pointer-events-auto overflow-x-auto flex gap-3 pb-safe hide-scroll">
                {scannedItems.map((result, idx) => (
                    <button
                        key={`${result.barcode}-${idx}`}
                        onClick={() => onItemClick(result)}
                        className="flex-shrink-0"
                    >
                        <Card className="w-20 h-24 flex flex-col items-center justify-center gap-2 bg-black/60 hover:bg-black/80 border-white/10 p-2">
                            {result.product?.imageUrl ? (
                                <img src={result.product.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                    <Package size={16} className="text-white/70" />
                                </div>
                            )}
                            <span className="text-[10px] text-white/70 text-center leading-tight line-clamp-2 w-full">
                                {result.product?.name || result.suggestion?.name || result.barcode}
                            </span>
                        </Card>
                    </button>
                ))}
            </div>
        </div>
    );
}
