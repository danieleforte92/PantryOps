import { cn } from '../../lib/utils';

interface ScannerReticleProps {
    className?: string;
    isScanning?: boolean;
}

export function ScannerReticle({ className, isScanning = true }: ScannerReticleProps) {
    return (
        <div className={cn("relative flex items-center justify-center w-64 h-64", className)}>
            {/* Label - Positioned absolutely above the reticle so it doesn't affect centering */}
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-max px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-3 animate-fade-in-up z-20">
                <div className={cn("w-2 h-2 rounded-full", isScanning ? "bg-primary animate-pulse" : "bg-gray-400")}></div>
                <span className="text-sm font-medium text-gray-100 tracking-wide">Inquadra un codice a barre</span>
            </div>

            {/* Reticle Mask Hole */}
            <div className="absolute inset-0 rounded-[2rem] scanner-mask overflow-hidden">
                {/* 
                   Corners need to align with the hole's rounding.
                   rounded-[2rem] is 32px.
                */}

                {/* Top Left */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[4px] border-l-[4px] border-primary rounded-tl-[2rem] z-10"></div>
                {/* Top Right */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[4px] border-r-[4px] border-primary rounded-tr-[2rem] z-10"></div>
                {/* Bottom Left */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[4px] border-l-[4px] border-primary rounded-bl-[2rem] z-10"></div>
                {/* Bottom Right */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[4px] border-r-[4px] border-primary rounded-br-[2rem] z-10"></div>

                {/* Scan Line */}
                {isScanning && (
                    <div className="scan-line absolute top-0 left-0 rounded-[2rem] z-0"></div>
                )}
            </div>
        </div>
    );
}
