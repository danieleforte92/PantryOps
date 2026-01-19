import { Refrigerator, Snowflake, Archive } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Location } from '../../api/client';

interface StorageSelectorProps {
    locations: Location[];
    selectedLocationId: string;
    onSelect: (id: string) => void;
    className?: string;
}

export function StorageSelector({ locations, selectedLocationId, onSelect, className }: StorageSelectorProps) {
    const getIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('frigo')) return <Refrigerator size={24} />;
        if (lower.includes('congelatore') || lower.includes('freezer')) return <Snowflake size={24} />;
        return <Archive size={24} />;
    };

    return (
        <div className={cn("grid grid-cols-3 gap-3", className)}>
            {locations.map((loc) => {
                const isSelected = selectedLocationId === loc.id;
                return (
                    <button
                        key={loc.id}
                        type="button"
                        onClick={() => onSelect(loc.id)}
                        className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 gap-2",
                            isSelected
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105"
                                : "bg-white dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700/80"
                        )}
                    >
                        <div className={cn("transition-transform duration-200", isSelected && "scale-110")}>
                            {getIcon(loc.name)}
                        </div>
                        <span className="text-xs font-semibold truncate w-full text-center">
                            {loc.name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
