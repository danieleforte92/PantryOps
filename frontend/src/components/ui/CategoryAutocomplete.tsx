import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { IngredientCategory } from '../../api/client';

interface CategoryAutocompleteProps {
    categories: IngredientCategory[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function CategoryAutocomplete({
    categories,
    value,
    onChange,
    placeholder = 'Cerca categoria...',
    disabled,
    className
}: CategoryAutocompleteProps) {
    const selected = categories.find(c => c.id === value);
    const [query, setQuery] = useState(selected?.name ?? '');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const blurTimeout = useRef<number | null>(null);

    useEffect(() => {
        setQuery(selected?.name ?? '');
    }, [selected?.id]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter(c => c.name.toLowerCase().includes(q));
    }, [categories, query]);

    const handleSelect = (cat: IngredientCategory) => {
        onChange(cat.id);
        setQuery(cat.name);
        setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const cat = filtered[activeIndex];
            if (cat) handleSelect(cat);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <input
                type="text"
                value={query}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(e) => {
                    const next = e.target.value;
                    setQuery(next);
                    setOpen(true);
                    setActiveIndex(0);
                    if (value) onChange('');
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    if (blurTimeout.current) window.clearTimeout(blurTimeout.current);
                    blurTimeout.current = window.setTimeout(() => setOpen(false), 150);
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-12 pl-4 pr-10 rounded-xl bg-zinc-800 border border-white/10 focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder:text-zinc-600"
            />

            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-xl bg-zinc-900 border border-white/10 shadow-lg">
                    {filtered.map((cat, index) => (
                        <button
                            type="button"
                            key={cat.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(cat)}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-white/5 ${
                                index === activeIndex ? 'bg-white/10' : ''
                            }`}
                        >
                            <span className="text-white font-medium">{cat.name}</span>
                            <span className="text-xs text-gray-400">{cat.baseUnit.abbreviation}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
