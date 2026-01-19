import { Package, ChevronUp, Check, ScanLine } from 'lucide-react';
import type { ScanResult } from '../../api/client';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface LastScannedDrawerProps {
    scannedItems: ScanResult[];
    onItemClick: (item: ScanResult) => void;
    onFinish: () => void;
}

export function LastScannedDrawer({ scannedItems, onItemClick, onFinish }: LastScannedDrawerProps) {
    // If no items, we still show the drawer base or a "Ready" state to match mockup structure which implies a persistent bottom sheet
    // if (scannedItems.length === 0) return null;

    return (
        <div className="w-full z-20 pointer-events-auto bg-[#131f1e] border-t border-white/10 rounded-t-[2rem] shadow-[0_-10px_60px_rgba(0,0,0,0.7)] flex flex-col transition-transform duration-300 transform translate-y-0 animate-in slide-in-from-bottom-full">
            {/* Drawer Handle & Header */}
            <div className="w-full px-6 pt-3 pb-2 cursor-pointer hover:bg-white/5 transition-colors rounded-t-[2rem]">
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white tracking-tight">Ultimi Scansionati</h2>
                        <span className="bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/20">
                            {scannedItems.length} Elementi
                        </span>
                    </div>
                    <button className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white">
                        <ChevronUp className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll List */}
            <div className="overflow-x-auto hide-scroll px-6 pb-6 pt-4 gap-4 flex items-center min-h-[140px]">
                {scannedItems.map((result, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex-shrink-0 w-80 bg-[#1d2f2e] border rounded-2xl p-4 flex gap-4 items-center group relative overflow-hidden shadow-lg transition-all cursor-pointer",
                            idx === 0 ? "border-primary/40 hover:border-primary/60 hover:bg-[#233534]" : "border-white/5 hover:bg-[#233534]"
                        )}
                        onClick={() => onItemClick(result)}
                    >
                        {idx === 0 && <div className="absolute inset-y-0 left-0 w-1 bg-primary"></div>}

                        {result.product?.imageUrl ? (
                            <div
                                className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 bg-cover bg-center border border-white/10"
                                style={{ backgroundImage: `url(${result.product.imageUrl})` }}
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center border border-white/10">
                                <Package className="text-white/50 w-8 h-8" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold truncate text-lg">
                                {result.product?.name || result.suggestion?.name || result.barcode}
                            </h3>
                            <p className="text-primary text-xs font-medium mb-2">Appena scansionato</p>
                        </div>
                    </div>
                ))}

                {/* Scan More / Placeholder */}
                <div className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <ScanLine className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Scan</span>
                </div>
            </div>

            {/* Finish Button Area */}
            <div className="p-6 pt-2 bg-[#1d2f2e]/30 border-t border-white/5">
                <Button
                    onClick={onFinish}
                    className="w-full py-6 text-lg font-bold shadow-[0_4px_14px_0_rgba(38,156,146,0.39)] hover:shadow-[0_6px_20px_rgba(38,156,146,0.23)]"
                >
                    <Check className="mr-2 w-6 h-6" />
                    Completa e Revisiona
                </Button>
            </div>
        </div>
    );
}
