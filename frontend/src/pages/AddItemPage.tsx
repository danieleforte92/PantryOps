import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Package, Plus } from 'lucide-react';
import type { ScanResult } from '../api/client';
import { useCreateProduct, useLocations, usePurchase, useUnits } from '../hooks/useApi';
import { QuantityStepper } from '../components/ui/QuantityStepper';
import { QuickDateChips } from '../components/ui/QuickDateChips';
import { StorageSelector } from '../components/ui/StorageSelector';

type AddMode = 'create' | 'purchase';

interface AddItemLocationState {
    scanResult: ScanResult;
    barcode?: string;
}

export default function AddItemPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as AddItemLocationState | undefined;

    const [scanResult, setScanResult] = useState<ScanResult | null>(state?.scanResult ?? null);
    const [barcode] = useState(state?.barcode ?? state?.scanResult?.barcode ?? '');
    const [mode, setMode] = useState<AddMode>(state?.scanResult?.status === 'KNOWN' ? 'purchase' : 'create');
    const [error, setError] = useState('');

    const createProductMutation = useCreateProduct();
    const purchaseMutation = usePurchase();
    const { data: unitsData } = useUnits();
    const { data: locationsData } = useLocations();

    const initRef = useRef(false);

    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        imageUrl: '',
        stockUnitId: '',
        purchaseUnitId: '',
        defaultLocationId: '',
    });

    const [purchaseData, setPurchaseData] = useState({
        quantity: 1,
        bestBeforeDate: '',
        locationId: '',
    });

    const product = scanResult?.product;
    const suggestion = scanResult?.suggestion;

    useEffect(() => {
        if (!state?.scanResult) {
            navigate('/scan', { replace: true });
        }
    }, [navigate, state?.scanResult]);

    useEffect(() => {
        if (initRef.current) return;
        if (!scanResult) return;

        if (scanResult.status !== 'KNOWN') {
            if (!unitsData?.units?.length || !locationsData?.locations?.length) return;

            const defaultUnitId = unitsData.units.find((u) => u.name === 'Pezzi')?.id || '';
            const defaultLocationId = locationsData.locations[0]?.id || '';

            setNewProduct({
                name: suggestion?.name || '',
                description: '',
                imageUrl: suggestion?.imageUrl || '',
                stockUnitId: defaultUnitId,
                purchaseUnitId: defaultUnitId,
                defaultLocationId,
            });
            initRef.current = true;
        } else if (scanResult.status === 'KNOWN') {
            if (!locationsData?.locations?.length) return;
            const defaultLoc = product?.defaultLocation?.id || locationsData.locations[0]?.id || '';
            if (defaultLoc) {
                setPurchaseData((prev) => ({ ...prev, locationId: defaultLoc }));
            }
            initRef.current = true;
        }
    }, [scanResult, suggestion, unitsData, locationsData, product]);

    const progressLabel = useMemo(() => {
        if (mode === 'create') return { current: 1, total: 2, label: 'Dettagli prodotto' };
        return { current: 2, total: 2, label: 'Aggiungi alla dispensa' };
    }, [mode]);

    const handleCreateProduct = async () => {
        if (!newProduct.name || !newProduct.stockUnitId) {
            setError('Compila nome e unità');
            return;
        }

        try {
            const result = await createProductMutation.mutateAsync({
                name: newProduct.name,
                description: newProduct.description,
                imageUrl: newProduct.imageUrl || undefined,
                stockUnitId: newProduct.stockUnitId,
                purchaseUnitId: newProduct.purchaseUnitId || newProduct.stockUnitId,
                defaultLocationId: newProduct.defaultLocationId || undefined,
                barcode: barcode,
            });

            setScanResult({ status: 'KNOWN', product: result.product });
            setMode('purchase');
            setPurchaseData((prev) => ({
                ...prev,
                locationId: newProduct.defaultLocationId,
            }));
            setError('');
        } catch (err: any) {
            console.error('Create Product Error:', err);
            setError(err.message || 'Create failed');
        }
    };

    const handlePurchase = async () => {
        if (!scanResult?.product) return;

        try {
            await purchaseMutation.mutateAsync({
                productId: scanResult.product.id,
                quantity: purchaseData.quantity,
                locationId: purchaseData.locationId || undefined,
                bestBeforeDate: purchaseData.bestBeforeDate
                    ? new Date(purchaseData.bestBeforeDate).toISOString()
                    : undefined,
            });

            navigate('/scan', { replace: true });
        } catch (err: any) {
            console.error('Purchase Error:', err);
            setError(err.message || 'Purchase failed');
        }
    };

    if (!scanResult) return null;

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-white">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
                <div className="px-6 py-5 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/scan')}
                        className="size-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">Step {progressLabel.current}/{progressLabel.total}</p>
                        <h1 className="text-xl font-black">{progressLabel.label}</h1>
                    </div>
                </div>
                <div className="px-6 pb-4">
                    <div className="h-2 w-full bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(progressLabel.current / progressLabel.total) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="px-6 pb-24 pt-6 max-w-2xl mx-auto">
                {/* Suggestion / Product Card */}
                {mode === 'create' && suggestion && (
                    <div className="bg-white dark:bg-zinc-800/80 border border-gray-100 dark:border-white/5 rounded-[1.5rem] p-4 mb-6 shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            {suggestion.imageUrl && (
                                <img src={suggestion.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white" />
                            )}
                            <div className="flex-1">
                                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Dati OpenFoodFacts</p>
                                <p className="font-bold text-gray-900 dark:text-gray-100 leading-tight text-lg">{suggestion.name}</p>
                                {suggestion.brand && <p className="text-xs text-text-muted font-medium">{suggestion.brand}</p>}
                            </div>
                        </div>

                    </div>
                )}

                {mode === 'purchase' && product && (
                    <div className="bg-white dark:bg-zinc-900/50 border border-gray-100 dark:border-white/5 rounded-[1.5rem] p-5 mb-6 shadow-sm flex items-center gap-4">
                        {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-2xl object-cover bg-white shadow-sm" />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                                <Package size={28} />
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-lg font-bold leading-tight">{product.name}</h2>
                            <p className="text-sm text-gray-500">
                                Stock: {product.currentStock?.quantity ?? 0} {product.stockUnit.abbreviation}
                            </p>
                        </div>
                    </div>
                )}

                {/* Create Flow */}
                {mode === 'create' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nome</label>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-4 text-lg font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                placeholder="Es. Pasta Barilla"
                                value={newProduct.name}
                                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unità</label>
                            <div className="grid grid-cols-3 gap-2">
                                {unitsData?.units.slice(0, 6).map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => setNewProduct((p) => ({ ...p, stockUnitId: u.id, purchaseUnitId: u.id }))}
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
                                    onSelect={(id) => setNewProduct((p) => ({ ...p, defaultLocationId: id }))}
                                />
                            )}
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
                    </div>
                )}

                {/* Purchase Flow */}
                {mode === 'purchase' && product && (
                    <div className="space-y-6">
                        <div>
                            <QuantityStepper
                                value={purchaseData.quantity}
                                onChange={(val) => setPurchaseData((p) => ({ ...p, quantity: val }))}
                                unitLabel={product.purchaseUnit.abbreviation}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Scadenza (Opzionale)</label>
                            <div className="space-y-3">
                                <QuickDateChips
                                    onDateSelect={(date) => setPurchaseData((p) => ({ ...p, bestBeforeDate: date }))}
                                />
                                <input
                                    type="date"
                                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-gray-900 dark:text-white transition-all font-display"
                                    value={purchaseData.bestBeforeDate}
                                    onChange={(e) => setPurchaseData((p) => ({ ...p, bestBeforeDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Posizione</label>
                            {locationsData && (
                                <StorageSelector
                                    locations={locationsData.locations}
                                    selectedLocationId={purchaseData.locationId}
                                    onSelect={(id) => setPurchaseData((p) => ({ ...p, locationId: id }))}
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => navigate('/scan')}
                                className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-semibold py-4 rounded-xl shadow-sm active:scale-95 transition-all"
                            >
                                Scansiona un altro
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={purchaseMutation.isPending}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {purchaseMutation.isPending ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Plus size={22} />
                                        <span>Aggiungi al carico</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    <span className="font-medium">{error}</span>
                </div>
            )}
        </div>
    );
}
