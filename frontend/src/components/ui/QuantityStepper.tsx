import { Minus, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface QuantityStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    unitLabel?: string;
    className?: string;
}

export function QuantityStepper({
    value,
    onChange,
    min = 1,
    max = 999,
    unitLabel = '',
    className
}: QuantityStepperProps) {
    const decrease = () => onChange(Math.max(min, value - 1));
    const increase = () => onChange(Math.min(max, value + 1));

    return (
        <div className={cn("bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-4", className)}>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Quantità</label>
            <div className="flex items-center justify-between">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={decrease}
                    disabled={value <= min}
                    className="h-12 w-12 rounded-xl text-xl"
                >
                    <Minus size={20} />
                </Button>

                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white font-display">{value}</span>
                    {unitLabel && (
                        <span className="text-gray-500 font-medium">{unitLabel}</span>
                    )}
                </div>

                <Button
                    variant="default" // Primary color for add
                    size="icon"
                    onClick={increase}
                    disabled={value >= max}
                    className="h-12 w-12 rounded-xl text-xl shadow-lg shadow-primary/30"
                >
                    <Plus size={20} />
                </Button>
            </div>
        </div>
    );
}
