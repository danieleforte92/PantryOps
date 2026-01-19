import { Badge } from './Badge';

export type StockStatus = 'good' | 'low' | 'expiring' | 'expired';

interface StockStatusBadgeProps {
    status: StockStatus;
    className?: string;
    showLabel?: boolean;
}

export function StockStatusBadge({ status, className, showLabel = true }: StockStatusBadgeProps) {
    const config = {
        good: { variant: 'success', label: 'Disponibile', icon: 'check_circle' },
        low: { variant: 'warning', label: 'In esaurimento', icon: 'warning' },
        expiring: { variant: 'warning', label: 'In scadenza', icon: 'schedule' },
        expired: { variant: 'destructive', label: 'Scaduto', icon: 'error' },
    } as const;

    const { variant, label, icon } = config[status];

    return (
        <Badge variant={variant} className={className}>
            <span className="material-symbols-outlined text-[16px] mr-1" style={{ fontSize: '16px' }}>{icon}</span>
            {showLabel && label}
        </Badge>
    );
}
