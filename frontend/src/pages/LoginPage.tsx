import { useState } from 'react';
import { authApi } from '../api/client';
import { setAuth } from '../hooks/useApi';
import { Package } from 'lucide-react';

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
        <div className="page flex items-center justify-center" style={{ minHeight: '100vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="text-center mb-xl">
                    <div
                        className="flex items-center justify-center mb-md"
                        style={{
                            width: '4rem',
                            height: '4rem',
                            margin: '0 auto',
                            background: 'var(--gradient-primary)',
                            borderRadius: 'var(--radius-lg)',
                        }}
                    >
                        <Package size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)' }}>BetterGrocy</h1>
                    <p className="text-muted" style={{ marginTop: 'var(--space-sm)' }}>
                        Modern home inventory management
                    </p>
                </div>

                <div className="flex gap-sm mb-lg">
                    <button
                        type="button"
                        className={`btn flex-1 ${isLogin ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        className={`btn flex-1 ${!isLogin ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Registrati
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-md">
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-md">
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {!isLogin && (
                        <>
                            <div className="mb-md">
                                <label className="label">Nome (opzionale)</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="mb-md">
                                <label className="label">Nome Household</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={householdName}
                                    onChange={(e) => setHouseholdName(e.target.value)}
                                    placeholder="es. Casa Rossi"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="text-danger mb-md" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                        {loading ? <div className="loader" style={{ width: '1.5rem', height: '1.5rem' }} /> : isLogin ? 'Accedi' : 'Registrati'}
                    </button>
                </form>
            </div>
        </div>
    );
}
