import { useExpiringItems, useLowStock, useAuth } from '../hooks/useApi';
import { AlertTriangle, Clock, Package, ChevronRight } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
    const { household } = useAuth();
    const { data: expiringData, isLoading: loadingExpiring } = useExpiringItems();
    const { data: lowStockData, isLoading: loadingLowStock } = useLowStock();

    const expiredCount = expiringData?.expired.length ?? 0;
    const todayCount = expiringData?.today.length ?? 0;
    const weekCount = expiringData?.thisWeek.length ?? 0;
    const lowStockCount = lowStockData?.lowStock.length ?? 0;

    return (
        <div className="animate-fadeIn">
            <header className="mb-xl">
                <h1>Ciao! 👋</h1>
                <p className="text-muted">{household?.name}</p>
            </header>

            {/* Alert Cards */}
            <div className="grid gap-md mb-xl">
                {/* Expired */}
                {expiredCount > 0 && (
                    <div className="card" style={{ borderColor: 'var(--color-danger)', borderWidth: '2px' }}>
                        <div className="flex items-center gap-md">
                            <div
                                style={{
                                    padding: 'var(--space-sm)',
                                    background: 'var(--color-danger-soft)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <AlertTriangle size={24} color="var(--color-danger)" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-danger">{expiredCount} scaduti</h3>
                                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Prodotti da consumare subito o eliminare
                                </p>
                            </div>
                            <ChevronRight size={20} className="text-muted" />
                        </div>
                    </div>
                )}

                {/* Expiring Today */}
                {todayCount > 0 && (
                    <div className="card" style={{ borderColor: 'var(--color-warning)', borderWidth: '2px' }}>
                        <div className="flex items-center gap-md">
                            <div
                                style={{
                                    padding: 'var(--space-sm)',
                                    background: 'var(--color-warning-soft)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <Clock size={24} color="var(--color-warning)" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-warning">{todayCount} scadono oggi</h3>
                                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                    Da consumare entro oggi
                                </p>
                            </div>
                            <ChevronRight size={20} className="text-muted" />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-2 gap-md mb-xl">
                <Link to="/stock" className="card" style={{ textDecoration: 'none' }}>
                    <div className="flex items-center gap-md">
                        <div
                            style={{
                                padding: 'var(--space-sm)',
                                background: 'var(--color-accent-soft)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <Clock size={20} color="var(--color-accent)" />
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>In scadenza</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>{weekCount}</p>
                        </div>
                    </div>
                </Link>

                <Link to="/shopping" className="card" style={{ textDecoration: 'none' }}>
                    <div className="flex items-center gap-md">
                        <div
                            style={{
                                padding: 'var(--space-sm)',
                                background: 'var(--color-success-soft)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <Package size={20} color="var(--color-success)" />
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Da comprare</p>
                            <p style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>{lowStockCount}</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Expiring This Week */}
            {weekCount > 0 && (
                <section>
                    <h2 className="mb-md" style={{ fontSize: 'var(--font-size-lg)' }}>
                        In scadenza questa settimana
                    </h2>
                    <div className="flex flex-col gap-sm">
                        {expiringData?.thisWeek.slice(0, 5).map((item) => (
                            <div key={item.lotId} className="card" style={{ padding: 'var(--space-md)' }}>
                                <div className="flex items-center gap-md">
                                    {item.product.imageUrl ? (
                                        <img
                                            src={item.product.imageUrl}
                                            alt={item.product.name}
                                            style={{
                                                width: '3rem',
                                                height: '3rem',
                                                objectFit: 'cover',
                                                borderRadius: 'var(--radius-md)',
                                            }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                width: '3rem',
                                                height: '3rem',
                                                background: 'var(--color-surface)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Package size={20} className="text-muted" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p style={{ fontWeight: 500 }}>{item.product.name}</p>
                                        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                            {item.quantity} {item.product.unit} • {item.location}
                                        </p>
                                    </div>
                                    <span className="badge badge-warning">
                                        {format(new Date(item.bestBeforeDate), 'dd MMM', { locale: it })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {loadingExpiring || loadingLowStock ? (
                <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="loader" />
                </div>
            ) : null}
        </div>
    );
}
