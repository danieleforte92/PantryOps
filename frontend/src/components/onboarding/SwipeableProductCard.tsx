import { useState, useRef } from 'react';
import { Check, X, Utensils } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SwipeableProductCardProps {
    name: string;
    category: string;
    defaultQuantity: number;
    unit: string;
    emoji?: string;
    isConfirmed: boolean;
    onConfirm: () => void;
    onDiscard: () => void;
    isActive: boolean;
}

export function SwipeableProductCard({
    name,
    category,
    defaultQuantity,
    unit,
    emoji = '📦',
    isConfirmed,
    onConfirm,
    onDiscard,
    isActive,
}: SwipeableProductCardProps) {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef(0);

    const SWIPE_THRESHOLD = 100;

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isActive || isConfirmed) return;
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        startXRef.current = clientX;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || !isActive || isConfirmed) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const diff = clientX - startXRef.current;
        setDragX(diff);
    };

    const handleTouchEnd = () => {
        if (!isDragging || isConfirmed) return;
        setIsDragging(false);

        if (dragX > SWIPE_THRESHOLD) {
            onConfirm();
        } else if (dragX < -SWIPE_THRESHOLD) {
            onDiscard();
        }

        setDragX(0);
    };

    // Calculate transform based on drag
    const getSwipeStyles = () => {
        if (!isDragging || isConfirmed) return {};

        const absDrag = Math.abs(dragX);
        const scale = 1 - (absDrag / 1000);
        const rotate = dragX * 0.05;

        return {
            transform: `translateX(${dragX}px) rotate(${rotate}deg) scale(${Math.max(scale, 0.95)})`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        };
    };

    // Background color based on swipe direction
    const getBackgroundStyle = () => {
        if (!isDragging || isConfirmed) return {};

        if (dragX > 0) {
            return {
                background: `linear-gradient(to right, rgba(34, 197, 94, ${Math.min(dragX / SWIPE_THRESHOLD, 0.3)}), transparent)`,
            };
        } else {
            return {
                background: `linear-gradient(to left, rgba(239, 68, 68, ${Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 0.3)}), transparent)`,
            };
        }
    };

    if (isConfirmed) {
        return (
            <div className="relative bg-green-50 border-2 border-green-400 rounded-2xl p-4 mb-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                            <p className="font-semibold text-green-800">{name}</p>
                            <p className="text-sm text-green-600">{category}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-green-700">
                            {defaultQuantity} {unit}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mb-3 select-none">
            {/* Background indicators */}
            <div className="absolute inset-0 flex justify-between items-center px-4 rounded-2xl overflow-hidden">
                <div
                    className={cn(
                        "flex items-center gap-2 transition-opacity duration-200",
                        dragX > 0 ? "opacity-100" : "opacity-0"
                    )}
                >
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                        <Check className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-green-700 font-medium">Aggiungi</span>
                </div>
                <div
                    className={cn(
                        "flex items-center gap-2 transition-opacity duration-200",
                        dragX < 0 ? "opacity-100" : "opacity-0"
                    )}
                >
                    <span className="text-red-700 font-medium">Scarta</span>
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                        <X className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>

            {/* Card */}
            <div
                ref={cardRef}
                className={cn(
                    "relative bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm cursor-grab active:cursor-grabbing",
                    !isActive && "opacity-50 pointer-events-none"
                )}
                style={{
                    ...getSwipeStyles(),
                    ...getBackgroundStyle(),
                }}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                            <p className="font-semibold text-slate-800">{name}</p>
                            <p className="text-sm text-slate-500">{category}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Utensils className="w-4 h-4" />
                        <span>{defaultQuantity} {unit}</span>
                    </div>
                </div>

                {/* Click buttons fallback */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDiscard();
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Non ce l'ho
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Aggiungi
                    </button>
                </div>
            </div>
        </div>
    );
}
