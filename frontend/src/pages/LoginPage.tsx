import { useState } from 'react';
import { authApi } from '../api/client';
import { setAuth } from '../hooks/useApi';
import { Package } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [householdName, setHouseholdName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const result = await authApi.login({ email, password });
                if (result.household) {
                    setAuth(result.user, result.household);
                    window.location.reload();
                } else {
                    setError('No household found. Please register first.');
                }
            } else {
                const result = await authApi.register({ email, password, name, householdName });
                setAuth(result.user, result.household);
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-4">
            <Card className="w-full max-w-md border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                        <Package size={32} className="text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">BetterGrocy</CardTitle>
                    <p className="text-text-muted mt-2 font-medium">Modern home inventory management</p>
                </CardHeader>

                <CardContent>
                    <div className="flex gap-3 mb-8 bg-surface-light dark:bg-surface-dark p-1 rounded-xl border border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isLogin
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isLogin
                                    ? 'bg-primary text-white shadow-md'
                                    : 'text-text-muted hover:bg-gray-50 dark:hover:bg-white/5'
                                }`}
                            onClick={() => setIsLogin(false)}
                        >
                            Registrati
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-main dark:text-white ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-main dark:text-white"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-text-main dark:text-white ml-1">Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-main dark:text-white"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                placeholder="••••••••"
                            />
                        </div>

                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-main dark:text-white ml-1">Nome (opzionale)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-main dark:text-white"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Mario Rossi"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-main dark:text-white ml-1">Nome Household</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-text-main dark:text-white"
                                        value={householdName}
                                        onChange={(e) => setHouseholdName(e.target.value)}
                                        placeholder="es. Casa Rossi"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {error && (
                            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 text-base mt-2" isLoading={loading}>
                            {isLogin ? 'Accedi' : 'Registrati'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
