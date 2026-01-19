import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useApi';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
// Lazy load ScanPage to ensure camera permissions are only requested when visiting the route
const ScanPage = lazy(() => import('./pages/ScanPage'));
import StockPage from './pages/StockPage';
import ShoppingPage from './pages/ShoppingPage';
import RecipePage from './pages/RecipePage';

export default function App() {
    const { user } = useAuth();

    if (!user) {
        return <LoginPage />;
    }

    return (
        <Layout>
            <Suspense fallback={<div className="h-screen w-full bg-black" />}>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/scan" element={<ScanPage />} />
                    <Route path="/stock" element={<StockPage />} />
                    <Route path="/shopping" element={<ShoppingPage />} />
                    <Route path="/recipes" element={<RecipePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}
