import { NavLink } from 'react-router-dom';
import { Home, Package, ScanLine, ShoppingCart, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useApi';

export function Sidebar() {
    const { user } = useAuth();

    return (
        <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-gray-200 dark:border-white/5 bg-white dark:bg-surface-dark transition-colors duration-200 h-screen sticky top-0">
            <div className="flex flex-col p-6 gap-8">
                {/* Logo */}
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary">
                        <span className="material-symbols-outlined text-3xl">local_dining</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight text-text-main dark:text-white">BetterGrocy</h1>
                        <p className="text-text-muted text-xs font-medium">Minimize Waste</p>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col gap-2">
                    <NavLink
                        to="/"
                        className={({ isActive }: { isActive: boolean }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium text-sm ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }: { isActive: boolean }) => (
                            <>
                                <Home size={20} className={isActive ? "fill-current" : ""} />
                                <span>Dashboard</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/stock"
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium text-sm ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                            }`
                        }
                    >
                        <Package size={20} />
                        <span>Dispensa</span>
                    </NavLink>

                    <NavLink
                        to="/scan"
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium text-sm ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                            }`
                        }
                    >
                        <ScanLine size={20} />
                        <span>Scanner</span>
                    </NavLink>

                    <NavLink
                        to="/recipes"
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium text-sm ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                            }`
                        }
                    >
                        <BookOpen size={20} />
                        <span>Ricette</span>
                    </NavLink>

                    <NavLink
                        to="/shopping"
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium text-sm ${isActive
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-text-main dark:hover:text-white'
                            }`
                        }
                    >
                        <ShoppingCart size={20} />
                        <span>Spesa</span>
                    </NavLink>
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-gray-100 dark:border-white/5">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {user?.name?.slice(0, 2).toUpperCase() || 'ME'}
                    </div>
                    <div className="flex flex-col items-start truncate">
                        <span className="text-sm font-bold text-text-main dark:text-white truncate w-full text-left">{user?.name || 'Utente'}</span>
                        <span className="text-xs text-text-muted">Pro Member</span>
                    </div>
                </button>
            </div>
        </aside>
    );
}
