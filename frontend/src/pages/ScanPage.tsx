import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useScanProduct, useCreateProduct, usePurchase, useUnits, useLocations } from '../hooks/useApi';
import { X, Check, Plus, Package, Search } from 'lucide-react';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { QuickDateChips } from '../components/ui/QuickDateChips';
import { StorageSelector } from '../components/ui/StorageSelector';
import { ScannerReticle } from '../components/ui/ScannerReticle';
import { LastScannedDrawer } from '../components/ui/LastScannedDrawer';
import type { ScanResult } from '../api/client';

type ScanState = 'scanning' | 'found' | 'new' | 'adding' | 'manual';

export default function ScanPage() {
    const navigate = useNavigate();
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [barcode, setBarcode] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [lastScannedItems, setLastScannedItems] = useState<ScanResult[]>([]);
    const [error, setError] = useState('');
    const [cameraAvailable, setCameraAvailable] = useState(true);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanMutation = useScanProduct();
    const createProductMutation = useCreateProduct();
    const purchaseMutation = usePurchase();
    const { data: unitsData } = useUnits();
    const { data: locationsData } = useLocations();

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
                            // Valid scan: Pause camera immediately to prevent multiple triggers
                            try {
                                scanner.pause(true);
                            } catch (e) {
                                console.warn('Failed to pause scanner', e);
                            }
                            handleBarcodeScan(decodedText);
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
            if (scanner.isScanning) {
                scanner.stop().catch(console.error).finally(() => {
                    // @ts-ignore
                    try { scanner.clear(); } catch (e) { }
                });
            } else {
                // @ts-ignore
                try { scanner.clear(); } catch (e) { /* ignore */ }
            }
        };
    }, []);

    // Fix stale closure issue: Scanner callback runs in a closure created on mount.
    // We rely on state updates to trigger effects rather than doing it all in the callback.
    const handleBarcodeScan = async (code: string) => {
        setBarcode(code);
        setError('');

        try {
            const result = await scanMutation.mutateAsync(code);
            setScanResult(result);
            setLastScannedItems(prev => {
                if (prev[0]?.barcode === code) return prev;
                return [result, ...prev].slice(0, 5);
            });

            if (result.status === 'KNOWN') {
                setScanState('found');
                // Location setting moved to useEffect
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
                console.error("Scan Error:", err);
                setError(err.message || 'Scan failed');
            }
        }
    };

    // Effect to set default location when product is found or locations load
    useEffect(() => {
        if (scanState === 'found' && scanResult?.product && !purchaseData.locationId) {
            const defaultLoc = scanResult.product.defaultLocation?.id || locationsData?.locations[0]?.id || '';
            if (defaultLoc) {
                setPurchaseData(prev => ({ ...prev, locationId: defaultLoc }));
            }
        } else if (scanState === 'new' && !newProduct.defaultLocationId && locationsData?.locations.length) {
            setNewProduct(prev => ({ ...prev, defaultLocationId: locationsData.locations[0].id }));
        }
    }, [scanState, scanResult, locationsData, purchaseData.locationId, newProduct.defaultLocationId]);

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
            console.error("Create Product Error:", err);
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
            console.error("Purchase Error:", err);
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
            try {
                scannerRef.current.resume();
            } catch (err) {
                console.log('Scanner resume skipped/failed (stateless check):', err);
            }
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualBarcode.trim()) return;
        await handleBarcodeScan(manualBarcode.trim());
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden font-display text-white">
            {/* 1. Camera Layer */}
            <div className="absolute inset-0 z-0 bg-black">
                {!cameraAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background-dark z-20">
                        <div className="text-center p-6">
                            <span className="material-symbols-outlined text-4xl text-gray-500 mb-4">no_photography</span>
                            <p className="text-gray-400">Camera non disponibile</p>
                        </div>
                    </div>
                )}
                <div
                    id="scanner"
                    className="w-full h-full"
                    style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        opacity: cameraAvailable ? 1 : 0
                    }}
                />
            </div>

            {/* 2. Scanning UI Overlay */}
            {scanState === 'scanning' && (
                <>
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-auto z-20">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center justify-center size-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all text-white shadow-lg active:scale-95 group"
                            >
                                <span className="material-symbols-outlined group-hover:text-white transition-colors">arrow_back</span>
                            </button>

                            <div className="flex gap-3">
                                <button
                                    className="flex items-center justify-center size-12 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all text-white shadow-lg active:scale-95 group"
                                    title="Toggle Flashlight"
                                    onClick={() => {/* Toggle flashlight logic */ }}
                                >
                                    <span className="material-symbols-outlined text-white/80 group-hover:text-yellow-300 transition-colors">flash_on</span>
                                </button>

                                <button
                                    className="flex items-center gap-2 h-12 px-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 hover:border-white/20 transition-all text-white shadow-lg active:scale-95 group"
                                    onClick={() => setScanState('manual')}
                                >
                                    <span className="material-symbols-outlined text-white/80 group-hover:text-primary transition-colors">keyboard</span>
                                    <span className="text-sm font-semibold hidden sm:block">Manuale</span>
                                </button>
                            </div>
                        </div>

                        {/* Center Reticle */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <ScannerReticle isScanning={!scanResult} />
                        </div>
                    </div>

                    {/* LastScannedDrawer */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
                        <LastScannedDrawer
                            scannedItems={lastScannedItems}
                            onItemClick={(item) => {
                                setScanResult(item);
                                if (item.status === 'KNOWN') setScanState('found');
                                else setScanState('new');
                            }}
                            onFinish={() => navigate('/')}
                        />
                    </div>
                </>
            )}

            {/* 3. Product Found Modal */}
            {scanState === 'found' && scanResult?.product && (
                <div className="absolute inset-x-0 bottom-0 z-20 bg-background-light dark:bg-zinc-900 rounded-t-3xl p-6 shadow-2xl animate-slide-up">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-6" />

                    <div className="flex items-start gap-4 mb-6">
                        {scanResult.product.imageUrl ? (
                            <img src={scanResult.product.imageUrl} alt={scanResult.product.name} className="w-20 h-20 rounded-2xl object-cover bg-white shadow-sm" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <Package size={32} />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1">{scanResult.product.name}</h2>
                            <p className="text-sm text-gray-500">
                                Stock: {scanResult.product.currentStock?.quantity ?? 0} {scanResult.product.stockUnit.abbreviation}
                            </p>
                        </div>
                        <button onClick={resetScanner} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <QuantityStepper
                            value={purchaseData.quantity}
                            onChange={(val) => setPurchaseData(p => ({ ...p, quantity: val }))}
                            unitLabel={scanResult.product.purchaseUnit.abbreviation}
                            className="w-full"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Scadenza (Opzionale)</label>
                        <div className="space-y-3">
                            <QuickDateChips
                                onDateSelect={(date) => setPurchaseData(p => ({ ...p, bestBeforeDate: date }))}
                            />
                            <input
                                type="date"
                                className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white transition-all font-display"
                                value={purchaseData.bestBeforeDate}
                                onChange={(e) => setPurchaseData(p => ({ ...p, bestBeforeDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Posizione</label>
                        {locationsData && (
                            <StorageSelector
                                locations={locationsData.locations}
                                selectedLocationId={purchaseData.locationId}
                                onSelect={(id) => setPurchaseData(p => ({ ...p, locationId: id }))}
                            />
                        )}
                    </div>

                    <button
                        onClick={handlePurchase}
                        disabled={purchaseMutation.isPending}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {purchaseMutation.isPending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus size={24} />
                                <span>Aggiungi al carico</span>
                            </>
                        )}
                    </button>
                    <div className="h-6" />
                </div>
            )}

            {/* 4. New Product Modal */}
            {scanState === 'new' && (
                <div className="absolute inset-x-0 bottom-0 z-20 bg-background-light dark:bg-zinc-900 rounded-t-3xl p-6 shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nuovo Prodotto</h2>
                        <button onClick={resetScanner} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    {scanResult?.suggestion && (
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-4">
                            {scanResult.suggestion.imageUrl && (
                                <img src={scanResult.suggestion.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            )}
                            <div>
                                <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">Suggerito</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{scanResult.suggestion.name}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6 mb-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nome</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-4 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                placeholder="Es. Pasta Barilla"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unità</label>
                            <div className="grid grid-cols-3 gap-2">
                                {unitsData?.units.slice(0, 6).map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => setNewProduct(p => ({ ...p, stockUnitId: u.id, purchaseUnitId: u.id }))}
                                        className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${newProduct.stockUnitId === u.id
                                            ? 'bg-primary text-white shadow-lg shadow-primary/25 ring-2 ring-primary ring-offset-2 ring-offset-background'
                                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Posizione Default</label>
                            {locationsData && (
                                <StorageSelector
                                    locations={locationsData.locations}
                                    selectedLocationId={newProduct.defaultLocationId}
                                    onSelect={(id) => setNewProduct(p => ({ ...p, defaultLocationId: id }))}
                                />
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCreateProduct}
                        disabled={createProductMutation.isPending}
                        className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {createProductMutation.isPending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={20} />
                                <span>Salva e Continua</span>
                            </>
                        )}
                    </button>
                    <div className="h-6" />
                </div>
            )}

            {/* 5. Adding State Overlay */}
            {scanState === 'adding' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="font-medium text-lg">Aggiunta in corso...</p>
                </div>
            )}

            {/* 6. Manual Input Modal */}
            {scanState === 'manual' && (
                <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">Inserimento Manuale</h2>
                            <button onClick={resetScanner} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Codice a Barre</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg text-white placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="Scansiona o inserisci..."
                                    value={manualBarcode}
                                    onChange={(e) => setManualBarcode(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!manualBarcode.trim() || scanMutation.isPending}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {scanMutation.isPending ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Search size={20} />
                                        <span>Cerca Prodotto</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-md animate-bounce flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    <span className="font-medium">{error}</span>
                </div>
            )}
        </div>
    );
}
