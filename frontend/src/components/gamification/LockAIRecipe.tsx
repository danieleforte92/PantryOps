import { Lock, Sparkles } from 'lucide-react';
import { useAIStatus } from '../../hooks/useGamification';

interface LockAIRecipeProps {
    children: React.ReactNode;
}

export function LockAIRecipe({ children }: LockAIRecipeProps) {
    const { data: aiStatus, isLoading } = useAIStatus();

    if (isLoading) {
        return (
            <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        );
    }

    if (!aiStatus) return null;

    const { unlocked, totalPoints, requiredPoints, remainingPoints } = aiStatus;

    if (unlocked) {
        return <>{children}</>;
    }

    const progress = (totalPoints / requiredPoints) * 100;

    return (
        <div className="relative">
            {/* Blurred content background */}
            <div className="blur-sm opacity-50 pointer-events-none select-none">
                {children}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center shadow-lg">
                        <Lock className="w-8 h-8 text-slate-500" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        Generazione AI Bloccata
                    </h3>
                    <p className="text-slate-600 mb-4">
                        Raggiungi 500 punti per sbloccare la generazione di ricette con intelligenza artificiale!
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600">Progresso</span>
                            <span className="text-sm font-semibold text-primary">
                                {totalPoints} / {requiredPoints}
                            </span>
                        </div>
                        <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="absolute h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Mancano {remainingPoints} punti
                        </p>
                    </div>

                    <div className="flex items-start gap-3 text-left text-sm text-slate-600 bg-blue-50 rounded-xl p-3">
                        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p>
                            <strong>Come guadagnare punti:</strong>
                            <br />
                            • Cucina ricette (+30 punti)
                            <br />
                            • Crea nuove ricette (+25 punti)
                            <br />
                            • Scansiona prodotti (+15 punti)
                            <br />
                            • Mantieni lo streak giornaliero
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Alternative: Show as a card instead of overlay
export function LockAIRecipeCard() {
    const { data: aiStatus, isLoading } = useAIStatus();

    if (isLoading || !aiStatus) return null;

    const { unlocked, totalPoints, requiredPoints } = aiStatus;

    if (unlocked) return null;

    const progress = (totalPoints / requiredPoints) * 100;

    return (
        <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-300">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">AI Recipe Generator</h3>
                    <p className="text-sm text-slate-500">Sblocca a 500 punti</p>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Progresso</span>
                    <span className="font-medium text-slate-800">
                        {totalPoints} / {requiredPoints}
                    </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                </div>
            </div>

            <div className="text-xs text-slate-500">
                <strong>Guadagna punti:</strong> Cucina, crea ricette, scansiona prodotti
            </div>
        </div>
    );
}
