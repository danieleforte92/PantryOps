import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { NavLink } from 'react-router-dom'; // Keep NavLink for Mobile Bottom Nav only if we want it, but aligning to Sidebar mostly.
import { Home, Package, ShoppingCart, ScanLine } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 font-display transition-colors duration-200 overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <MobileHeader />

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-10 pb-24 lg:pb-10 scroll-smooth">
                    <div className="max-w-[1400px] mx-auto w-full">
                        {children}
                    </div>
                </div>

                {/* Mobile Bottom Nav (Optional, kept for now as per previous design, but maybe redundant with Sidebar logic? Use visually hidden on Large) */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-white/5 p-2 px-6 flex justify-between items-center z-30 pb-safe">
                    <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        <Home size={24} />
                        <span className="text-[10px] font-medium">Home</span>
                    </NavLink>
                    <NavLink to="/stock" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        <Package size={24} />
                        <span className="text-[10px] font-medium">Dispensa</span>
                    </NavLink>
                    <NavLink to="/scan" className="p-4 bg-primary text-white rounded-full -mt-8 border-4 border-background-light dark:border-background-dark shadow-lg">
                        <ScanLine size={24} />
                    </NavLink>
                    <NavLink to="/recipes" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        <span className="material-symbols-outlined text-[24px]">menu_book</span>
                        <span className="text-[10px] font-medium">Ricette</span>
                    </NavLink>
                    <NavLink to="/shopping" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        <ShoppingCart size={24} />
                        <span className="text-[10px] font-medium">Spesa</span>
                    </NavLink>
                </nav>
            </main>
        </div>
    );
}
