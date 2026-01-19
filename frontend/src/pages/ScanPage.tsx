import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useScanProduct, useCreateProduct, usePurchase, useUnits, useLocations, useAuth } from '../hooks/useApi';
import { X, Check, Plus, Package, Search } from 'lucide-react';
import type { ScanResult } from '../api/client';

type ScanState = 'scanning' | 'found' | 'new' | 'adding';

export default function ScanPage() {
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [barcode, setBarcode] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [error, setError] = useState('');
    const [cameraAvailable, setCameraAvailable] = useState(true);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanMutation = useScanProduct();
    const createProductMutation = useCreateProduct();
    const purchaseMutation = usePurchase();
    const { data: unitsData } = useUnits();
    const { data: locationsData } = useLocations();
    const { household } = useAuth();

    // New product form
    const [newProduct, setNewProduct] = useState({
        name: '',
        stockUnitId: '',
        purchaseUnitId: '',
        defaultLocationId: '',
    });

    // Purchase form
    const [purchaseData, setPurchaseData] = useState({
        quantity: 1,
        bestBeforeDate: '',
        locationId: '',
    });

    useEffect(() => {
        // Safety check for element
        const element = document.getElementById('scanner');
        if (!element) return;

        let isMounted = true;
        const scanner = new Html5Qrcode('scanner');
        scannerRef.current = scanner;

        const startScanner = async () => {
            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 150 },
                        aspectRatio: 1.5,
                    },
                    (decodedText) => {
                        if (isMounted) {
                            handleBarcodeScan(decodedText);
                            // Don't pause here automatically to avoid UI freeze/state complexity
                            // blocking scan is handled by scanState
                        }
                    },
                    () => { /* ignore errors */ }
                );
            } catch (err) {
                console.warn('Scanner start failed:', err);
                if (isMounted) {
                    setCameraAvailable(false);
                }
            }
        };

        startScanner();

        return () => {
            isMounted = false;
            // Cleanup: stop if running, clear if not
            if (scanner.isScanning) {
                scanner.stop().catch(console.error).finally(() => {
                    // @ts-ignore - clear() might be void or Promise depending on version
                    try { scanner.clear(); } catch (e) { }
                });
            } else {
                // If not scanning (e.g. failed start), just clear
                // @ts-ignore
                try { scanner.clear(); } catch (e) { /* ignore */ }
            }
        };
    }, []);

    const handleBarcodeScan = async (code: string) => {
        setBarcode(code);
        setError('');

        try {
            const result = await scanMutation.mutateAsync(code);
            setScanResult(result);

            if (result.status === 'KNOWN') {
                setScanState('found');
                // Pre-fill location
                setPurchaseData((prev) => ({
                    ...prev,
                    locationId: result.product?.defaultLocation?.id || locationsData?.locations[0]?.id || '',
                }));
            } else if (result.status === 'SUGGESTED') {
                setScanState('new');
                setNewProduct({
                    name: result.suggestion?.name || '',
                    stockUnitId: unitsData?.units.find((u) => u.name === 'Pezzi')?.id || '',
                    purchaseUnitId: unitsData?.units.find((u) => u.name === 'Pezzi')?.id || '',
                    defaultLocationId: locationsData?.locations[0]?.id || '',
                });
            } else {
                setScanState('new');
            }
        } catch (err: any) {
            if (err.message?.includes('404') || err.message?.includes('not found')) {
                setScanState('new');
                setScanResult({ status: 'UNKNOWN', barcode: code });
            } else {
                setError(err.message || 'Scan failed');
            }
        }
    };

    const handleCreateProduct = async () => {
        if (!newProduct.name || !newProduct.stockUnitId) {
            setError('Compila nome e unità');
            return;
        }

        try {
            const result = await createProductMutation.mutateAsync({
                name: newProduct.name,
                stockUnitId: newProduct.stockUnitId,
                purchaseUnitId: newProduct.purchaseUnitId || newProduct.stockUnitId,
                defaultLocationId: newProduct.defaultLocationId,
                barcode: barcode,
            });

            // Switch to purchase state
            setScanResult({ status: 'KNOWN', product: result.product });
            setScanState('found');
            setPurchaseData((prev) => ({
                ...prev,
                locationId: newProduct.defaultLocationId,
            }));
        } catch (err: any) {
            setError(err.message || 'Create failed');
        }
    };

    const handlePurchase = async () => {
        if (!scanResult?.product) return;

        setScanState('adding');
        try {
            await purchaseMutation.mutateAsync({
                productId: scanResult.product.id,
                quantity: purchaseData.quantity,
                locationId: purchaseData.locationId || undefined,
                bestBeforeDate: purchaseData.bestBeforeDate
                    ? new Date(purchaseData.bestBeforeDate).toISOString()
                    : undefined,
            });

            // Reset and continue scanning
            resetScanner();
        } catch (err: any) {
            setError(err.message || 'Purchase failed');
            setScanState('found');
        }
    };

    const resetScanner = () => {
        setScanState('scanning');
        setScanResult(null);
        setBarcode('');
        setManualBarcode('');
        setError('');
        setPurchaseData({ quantity: 1, bestBeforeDate: '', locationId: '' });
        setNewProduct({ name: '', stockUnitId: '', purchaseUnitId: '', defaultLocationId: '' });

        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualBarcode.trim()) return;

        // Pause scanner if running
        if (scannerRef.current) {
            try {
                scannerRef.current.pause();
            } catch (_) { /* ignore */ }
        }

        await handleBarcodeScan(manualBarcode.trim());
    };

    return (
        <div className="animate-fadeIn">
            {/* Scanner View */}
            {scanState === 'scanning' && (
                <div style={{ position: 'relative' }}>
                    {/* Scanner div - always rendered for initialization, hidden if camera fails */}
                    <div
                        id="scanner"
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            margin: '0 auto',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            display: cameraAvailable ? 'block' : 'none',
                        }}
                    />

                    {cameraAvailable ? (
                        <p className="text-center text-muted" style={{ marginTop: 'var(--space-md)' }}>
                            Inquadra il codice a barre
                        </p>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <Package size={48} className="text-muted" style={{ margin: '0 auto var(--space-md)', display: 'block' }} />
                            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Camera non disponibile</h3>
                            <p className="text-muted">Inserisci il codice a barre manualmente</p>
                        </div>
                    )}

                    {/* Manual barcode input - ALWAYS visible */}
                    <div style={{ marginTop: 'var(--space-lg)', padding: '0 var(--space-md)' }}>
                        <div
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: 'var(--space-md)',
                            }}
                        >
                            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flex: 1, gap: 'var(--space-sm)', width: '100%' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Inserisci codice a barre"
                                    value={manualBarcode}
                                    onChange={(e) => setManualBarcode(e.target.value)}
                                    style={{ flex: 1 }}
                                    autoFocus={!cameraAvailable}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!manualBarcode.trim() || scanMutation.isPending}
                                >
                                    {scanMutation.isPending ? (
                                        <div className="loader" style={{ width: '1rem', height: '1rem' }} />
                                    ) : (
                                        <Search size={18} />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {error && (
                        <p className="text-center text-danger" style={{ marginTop: 'var(--space-sm)' }}>
                            {error}
                        </p>
                    )}
                </div>
            )}

            {/* Product Found - Quick Purchase */}
            {scanState === 'found' && scanResult?.product && (
                <div className="card animate-fadeIn">
                    <div className="flex items-center justify-between mb-lg">
                        <h2>Prodotto trovato</h2>
                        <button className="btn btn-icon btn-secondary" onClick={resetScanner}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-md mb-lg">
                        {scanResult.product.imageUrl ? (
                            <img
                                src={scanResult.product.imageUrl}
                                alt={scanResult.product.name}
                                style={{
                                    width: '5rem',
                                    height: '5rem',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '5rem',
                                    height: '5rem',
                                    background: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Package size={32} className="text-muted" />
                            </div>
                        )}
                        <div>
                            <h3>{scanResult.product.name}</h3>
                            <p className="text-muted">
                                Stock: {scanResult.product.currentStock?.quantity ?? 0} {scanResult.product.stockUnit.abbreviation}
                            </p>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="mb-md">
                        <label className="label">Quantità</label>
                        <div className="flex items-center gap-sm">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPurchaseData((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                            >
                                -
                            </button>
                            <input
                                type="number"
                                className="input text-center"
                                style={{ width: '5rem' }}
                                value={purchaseData.quantity}
                                onChange={(e) => setPurchaseData((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                                min={1}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPurchaseData((p) => ({ ...p, quantity: p.quantity + 1 }))}
                            >
                                +
                            </button>
                            <span className="text-muted">{scanResult.product.purchaseUnit.abbreviation}</span>
                        </div>
                    </div>

                    {/* Best Before Date */}
                    <div className="mb-md">
                        <label className="label">Scadenza (opzionale)</label>
                        <input
                            type="date"
                            className="input"
                            value={purchaseData.bestBeforeDate}
                            onChange={(e) => setPurchaseData((p) => ({ ...p, bestBeforeDate: e.target.value }))}
                        />
                    </div>

                    {/* Location */}
                    <div className="mb-lg">
                        <label className="label">Posizione</label>
                        <select
                            className="input"
                            value={purchaseData.locationId}
                            onChange={(e) => setPurchaseData((p) => ({ ...p, locationId: e.target.value }))}
                        >
                            {locationsData?.locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && <p className="text-danger mb-md">{error}</p>}

                    <button
                        className="btn btn-primary w-full"
                        onClick={handlePurchase}
                        disabled={purchaseMutation.isPending}
                    >
                        {purchaseMutation.isPending ? (
                            <div className="loader" style={{ width: '1.5rem', height: '1.5rem' }} />
                        ) : (
                            <>
                                <Plus size={20} />
                                Aggiungi
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* New Product Form */}
            {scanState === 'new' && (
                <div className="card animate-fadeIn">
                    <div className="flex items-center justify-between mb-lg">
                        <h2>Nuovo prodotto</h2>
                        <button className="btn btn-icon btn-secondary" onClick={resetScanner}>
                            <X size={20} />
                        </button>
                    </div>

                    {scanResult?.suggestion && (
                        <div
                            className="flex items-center gap-md mb-lg"
                            style={{ padding: 'var(--space-sm)', background: 'var(--color-success-soft)', borderRadius: 'var(--radius-md)' }}
                        >
                            {scanResult.suggestion.imageUrl && (
                                <img
                                    src={scanResult.suggestion.imageUrl}
                                    alt=""
                                    style={{ width: '3rem', height: '3rem', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                                />
                            )}
                            <div>
                                <p style={{ fontSize: 'var(--font-size-sm)' }}>Suggerito da OpenFoodFacts:</p>
                                <p style={{ fontWeight: 500 }}>{scanResult.suggestion.name}</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-md">
                        <label className="label">Nome prodotto</label>
                        <input
                            type="text"
                            className="input"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                            placeholder="es. Pasta Barilla 500g"
                        />
                    </div>

                    <div className="grid grid-2 gap-md mb-md">
                        <div>
                            <label className="label">Unità stock</label>
                            <select
                                className="input"
                                value={newProduct.stockUnitId}
                                onChange={(e) => setNewProduct((p) => ({ ...p, stockUnitId: e.target.value }))}
                            >
                                <option value="">Seleziona...</option>
                                {unitsData?.units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name} ({unit.abbreviation})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Posizione</label>
                            <select
                                className="input"
                                value={newProduct.defaultLocationId}
                                onChange={(e) => setNewProduct((p) => ({ ...p, defaultLocationId: e.target.value }))}
                            >
                                <option value="">Seleziona...</option>
                                {locationsData?.locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-danger mb-md">{error}</p>}

                    <button
                        className="btn btn-primary w-full"
                        onClick={handleCreateProduct}
                        disabled={createProductMutation.isPending}
                    >
                        {createProductMutation.isPending ? (
                            <div className="loader" style={{ width: '1.5rem', height: '1.5rem' }} />
                        ) : (
                            <>
                                <Check size={20} />
                                Crea prodotto
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Adding state */}
            {scanState === 'adding' && (
                <div className="flex flex-col items-center justify-center" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="loader mb-md" />
                    <p>Aggiunta in corso...</p>
                </div>
            )}
        </div>
    );
}
