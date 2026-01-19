import { cn } from '../../lib/utils';

interface ScannerReticleProps {
    className?: string;
    isScanning?: boolean;
}

export function ScannerReticle({ className, isScanning = true }: ScannerReticleProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center", className)}>
            <div className="mb-8 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3 animate-fade-in-up">
                <div className={cn("w-2 h-2 rounded-full", isScanning ? "bg-primary animate-pulse" : "bg-gray-400")}></div>
                <span className="text-sm font-medium text-gray-100 tracking-wide">Inquadra un codice a barre</span>
            </div>

            <div className="relative w-64 h-64 rounded-3xl border border-white/10 scanner-mask overflow-hidden">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>

                {/* Scan Line */}
                {isScanning && (
                    <div className="scan-line absolute top-0 left-0"></div>
                )}
            </div>
        </div>
    );
}
