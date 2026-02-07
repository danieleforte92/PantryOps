import { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useApi';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
// Lazy load ScanPage to ensure camera permissions are only requested when visiting the route
const ScanPage = lazy(() => import('./pages/ScanPage'));
import StockPage from './pages/StockPage';
import ShoppingPage from './pages/ShoppingPage';
import RecipePage from './pages/RecipePage';
import SettingsPage from './pages/SettingsPage';
import AddItemPage from './pages/AddItemPage';

export default function App() {
    const { user, household } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Show onboarding if user hasn't completed it (step < 4)
        if (user && user.onboardingStep !== undefined && user.onboardingStep < 4) {
            setShowOnboarding(true);
        }
    }, [user]);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        // Update local storage to reflect completed onboarding
        if (user) {
            const updatedUser = { ...user, onboardingStep: 4 };
            localStorage.setItem('bettergrocy_auth', JSON.stringify({
                user: updatedUser,
                household
            }));
        }
    };

    if (!user) {
        return <LoginPage />;
    }

    return (
        <>
            <Layout>
                <Suspense fallback={<div className="h-screen w-full bg-black" />}>
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/scan" element={<ScanPage />} />
                        <Route path="/scan/add" element={<AddItemPage />} />
                        <Route path="/stock" element={<StockPage />} />
                        <Route path="/shopping" element={<ShoppingPage />} />
                        <Route path="/recipes" element={<RecipePage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </Layout>

            <OnboardingWizard
                isOpen={showOnboarding}
                onComplete={handleOnboardingComplete}
            />
        </>
    );
}
