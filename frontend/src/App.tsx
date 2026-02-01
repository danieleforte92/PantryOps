import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useApi';
import { useUpdateStreak, useGamificationProfile } from './hooks/useGamification';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { AchievementToastContainer, useAchievementToasts } from './components/gamification';
// Lazy load ScanPage to ensure camera permissions are only requested when visiting the route
const ScanPage = lazy(() => import('./pages/ScanPage'));
import StockPage from './pages/StockPage';
import ShoppingPage from './pages/ShoppingPage';
import RecipePage from './pages/RecipePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
    const { user, household } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const { toasts, addToast, removeToast } = useAchievementToasts();
    const updateStreak = useUpdateStreak();
    const { data: profile } = useGamificationProfile();
    const streakUpdatedRef = useRef(false);

    useEffect(() => {
        // Show onboarding if user hasn't completed it (step < 4)
        if (user && user.onboardingStep !== undefined && user.onboardingStep < 4) {
            setShowOnboarding(true);
        }
    }, [user]);

    useEffect(() => {
        // Update streak on app load (if user is logged in) - only once
        if (user && household && !streakUpdatedRef.current) {
            streakUpdatedRef.current = true;
            updateStreak.mutate();
        }
    }, [user, household, updateStreak]);

    useEffect(() => {
        // Show toast for any new badges
        if (profile?.badges) {
            profile.badges.forEach((badge) => {
                // Only show toast for badges earned very recently (within last minute)
                const earnedAt = new Date(badge.earnedAt);
                const oneMinuteAgo = new Date(Date.now() - 60000);
                if (earnedAt > oneMinuteAgo) {
                    addToast({
                        type: badge.type,
                        name: badge.name,
                        description: badge.description,
                        icon: badge.icon,
                        points: badge.points,
                    });
                }
            });
        }
    }, [profile?.badges]);

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

            <AchievementToastContainer
                achievements={toasts}
                onDismiss={removeToast}
            />
        </>
    );
}
