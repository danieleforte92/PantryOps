import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, ShoppingCart, ScanLine } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="page">
            <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
                {children}
            </main>

            <nav className="bottom-nav">
                <div className="bottom-nav-inner">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Home size={24} />
                        <span>Home</span>
                    </NavLink>

                    <NavLink to="/stock" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Package size={24} />
                        <span>Scorte</span>
                    </NavLink>

                    <NavLink to="/scan" className="nav-item scan-btn">
                        <ScanLine size={28} color="white" />
                    </NavLink>

                    <NavLink to="/shopping" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <ShoppingCart size={24} />
                        <span>Spesa</span>
                    </NavLink>
                </div>
            </nav>
        </div>
    );
}
