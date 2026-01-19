import { useCurrentStock, useConsume } from '../hooks/useApi';
import { Package, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

export default function StockPage() {
    const { data, isLoading } = useCurrentStock();
    const consumeMutation = useConsume();
    const [consumingId, setConsumingId] = useState<string | null>(null);

    const handleConsume = async (productId: string, amount: number = 1) => {
        setConsumingId(productId);
        try {
            await consumeMutation.mutateAsync({ productId, quantity: amount });
        } catch (error) {
            console.error('Consume failed:', error);
        } finally {
            setConsumingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                <div className="loader" />
            </div>
        );
    }

    const stockItems = data?.stock ?? [];

    return (
        <div className="animate-fadeIn">
            <header className="mb-lg">
                <h1>Scorte</h1>
                <p className="text-muted">{stockItems.length} prodotti in dispensa</p>
            </header>

            {stockItems.length === 0 ? (
                <div className="empty-state">
                    <Package size={48} />
                    <h3>Nessun prodotto</h3>
                    <p className="text-muted">Scansiona un codice a barre per aggiungere prodotti</p>
                </div>
            ) : (
                <div className="flex flex-col gap-sm">
                    {stockItems.map((item) => (
                        <div key={item.productId} className="card" style={{ padding: 'var(--space-md)' }}>
                            <div className="flex items-center gap-md">
                                {item.product.imageUrl ? (
                                    <img
                                        src={item.product.imageUrl}
                                        alt={item.product.name}
                                        style={{
                                            width: '3.5rem',
                                            height: '3.5rem',
                                            objectFit: 'cover',
                                            borderRadius: 'var(--radius-md)',
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '3.5rem',
                                            height: '3.5rem',
                                            background: 'var(--color-surface)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Package size={24} className="text-muted" />
                                    </div>
                                )}

                                <div className="flex-1">
                                    <p style={{ fontWeight: 500 }}>{item.product.name}</p>
                                    <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                                        {item.quantity.toFixed(1)} {item.product.stockUnit.abbreviation}
                                    </p>
                                </div>

                                <div className="flex items-center gap-sm">
                                    <button
                                        className="btn btn-icon btn-secondary"
                                        onClick={() => handleConsume(item.productId, 1)}
                                        disabled={consumingId === item.productId || item.quantity <= 0}
                                        title="Consuma 1"
                                    >
                                        {consumingId === item.productId ? (
                                            <div className="loader" style={{ width: '1rem', height: '1rem' }} />
                                        ) : (
                                            <Minus size={18} />
                                        )}
                                    </button>

                                    <span
                                        style={{
                                            minWidth: '2.5rem',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            fontSize: 'var(--font-size-lg)',
                                        }}
                                    >
                                        {item.quantity}
                                    </span>

                                    <button
                                        className="btn btn-icon btn-primary"
                                        onClick={() => {
                                            // TODO: Quick purchase modal
                                        }}
                                        title="Aggiungi"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
