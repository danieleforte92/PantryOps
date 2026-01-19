import { Menu } from 'lucide-react';
import { useAuth } from '../hooks/useApi';

export function MobileHeader() {
    const { user } = useAuth();

    return (
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-white/5 sticky top-0 z-20">
            <button className="p-2 -ml-2 text-text-main dark:text-white">
                <Menu size={24} />
            </button>

            <span className="font-bold text-lg text-primary">BetterGrocy</span>

            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
            </div>
        </div>
    );
}
