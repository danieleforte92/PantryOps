import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useScanProduct } from '../hooks/useApi';
import { X, Search } from 'lucide-react';
import { ScannerReticle } from '../components/ui/ScannerReticle';
import { LastScannedDrawer } from '../components/ui/LastScannedDrawer';
import type { ScanResult } from '../api/client';

type ScanState = 'scanning' | 'processing' | 'manual';

export default function ScanPage() {
    const navigate = useNavigate();
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [manualBarcode, setManualBarcode] = useState('');
    const [lastScannedItems, setLastScannedItems] = useState<ScanResult[]>(() => {
        try {
            const stored = sessionStorage.getItem('PantryOps_last_scanned');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });
    const [error, setError] = useState('');
    const [cameraAvailable, setCameraAvailable] = useState(true);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scanMutation = useScanProduct();

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

    const handleBarcodeScan = async (code: string) => {
        setError('');
        setScanState('processing');

        try {
            const result = await scanMutation.mutateAsync(code);
            setLastScannedItems(prev => {
                if (prev[0]?.barcode === code) return prev;
                const next = [result, ...prev].slice(0, 5);
                sessionStorage.setItem('PantryOps_last_scanned', JSON.stringify(next));
                return next;
            });

            navigate('/scan/add', { state: { scanResult: result, barcode: code } });
        } catch (err: any) {
            if (err.message?.includes('404') || err.message?.includes('not found')) {
                const fallback: ScanResult = { status: 'UNKNOWN', barcode: code };
                setLastScannedItems(prev => {
                    const next = [fallback, ...prev].slice(0, 5);
                    sessionStorage.setItem('PantryOps_last_scanned', JSON.stringify(next));
                    return next;
                });
                navigate('/scan/add', { state: { scanResult: fallback, barcode: code } });
            } else {
                console.error('Scan Error:', err);
                setError(err.message || 'Scan failed');
                setScanState('scanning');
            }
        }
    };

    const resetScanner = () => {
        setScanState('scanning');
        setManualBarcode('');
        setError('');

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
                            <ScannerReticle isScanning />
                        </div>
                    </div>

                    {/* LastScannedDrawer */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
                        <LastScannedDrawer
                            scannedItems={lastScannedItems}
                            onItemClick={(item) => {
                                navigate('/scan/add', { state: { scanResult: item, barcode: item.barcode } });
                            }}
                            onFinish={() => navigate('/')}
                        />
                    </div>
                </>
            )}

            {/* 3. Processing State Overlay */}
            {scanState === 'processing' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="font-medium text-lg">Elaborazione in corso...</p>
                </div>
            )}

            {/* 4. Manual Input Modal */}
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
