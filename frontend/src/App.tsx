import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useApi';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import StockPage from './pages/StockPage';
import ShoppingPage from './pages/ShoppingPage';

export default function App() {
    const { user } = useAuth();

    if (!user) {
        return <LoginPage />;
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/shopping" element={<ShoppingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}
