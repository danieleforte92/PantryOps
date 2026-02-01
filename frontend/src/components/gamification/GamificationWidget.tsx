import { Trophy, Flame, Target } from 'lucide-react';
import { useGamificationProfile } from '../../hooks/useGamification';

export function GamificationWidget() {
    const { data: profile, isLoading } = useGamificationProfile();

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 animate-pulse">
                <div className="h-20 bg-slate-200 rounded-xl" />
            </div>
        );
    }

    if (!profile) return null;

    const { totalPoints, currentStreak, badges, nextUnlock } = profile;

    return (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    I tuoi progressi
                </h3>
                {currentStreak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm font-medium">{currentStreak} giorni</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{totalPoints}</p>
                    <p className="text-xs text-slate-600">punti totali</p>
                </div>
                <div className="bg-white/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{badges.length}</p>
                    <p className="text-xs text-slate-600">badge sbloccati</p>
                </div>
            </div>

            {nextUnlock && (
                <div className="bg-white/80 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-slate-500" />
                        <p className="text-sm font-medium text-slate-700">
                            Prossimo sblocco
                        </p>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                        {nextUnlock.feature} a {nextUnlock.points} punti
                    </p>
                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="absolute h-full bg-primary rounded-full transition-all"
                            style={{
                                width: `${Math.min((totalPoints / nextUnlock.points) * 100, 100)}%`,
                            }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">
                        Mancano {nextUnlock.remaining} punti
                    </p>
                </div>
            )}

            {badges.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {badges.slice(0, 5).map((badge) => (
                        <div
                            key={badge.id}
                            className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"
                            title={badge.name}
                        >
                            <span className="text-lg">{badge.icon}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
