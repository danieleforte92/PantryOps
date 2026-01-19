import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

interface QuickDateChipsProps {
    onDateSelect: (dateIso: string) => void;
    className?: string;
}

export function QuickDateChips({ onDateSelect, className }: QuickDateChipsProps) {
    const options = [
        { label: '+3 Giorni', action: () => addDays(new Date(), 3) },
        { label: '+1 Settimana', action: () => addWeeks(new Date(), 1) },
        { label: '+1 Mese', action: () => addMonths(new Date(), 1) },
    ];

    return (
        <div className={cn("flex gap-2 overflow-x-auto pb-2 hide-scroll", className)}>
            {options.map((opt) => (
                <button
                    key={opt.label}
                    onClick={() => onDateSelect(format(opt.action(), 'yyyy-MM-dd'))}
                    className="flex-shrink-0"
                    type="button"
                >
                    <Badge
                        variant="secondary"
                        className="px-3 py-1.5 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                    >
                        {opt.label}
                    </Badge>
                </button>
            ))}
        </div>
    );
}
