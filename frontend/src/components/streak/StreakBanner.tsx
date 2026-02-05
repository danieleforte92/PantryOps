import { Flame, AlertCircle, Trophy, Clock } from 'lucide-react';
import { useStreakStatus } from '../../hooks/useStreak';
import { Button } from '../ui/Button';

interface StreakBannerProps {
    onAction?: () => void;
}

export function StreakBanner({ onAction }: StreakBannerProps) {
    const { data: streak, isLoading } = useStreakStatus();

    if (isLoading || !streak) return null;

    const { currentStreak, isActiveToday, daysUntilStreakBreaks, pointsToNextMilestone } = streak;

    // Don't show if no streak yet
    if (currentStreak === 0) return null;

    // Show warning if streak is about to break
    if (!isActiveToday && daysUntilStreakBreaks <= 1) {
        return (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">Attenzione! 🔥</h3>
                        <p className="text-white/90 text-sm">
                            Lo streak di <span className="font-bold">{currentStreak} giorni</span> sta per interrompersi!
                            Cucina oggi per mantenerlo.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="bg-white text-orange-600 hover:bg-white/90 flex-shrink-0"
                        onClick={onAction}
                    >
                        Cucina ora
                    </Button>
                </div>
            </div>
        );
    }

    // Show milestone progress if approaching next badge
    if (pointsToNextMilestone <= 2 && pointsToNextMilestone > 0) {
        return (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">Milestone vicina! 🎯</h3>
                        <p className="text-white/90 text-sm">
                            Mancano solo <span className="font-bold">{pointsToNextMilestone} giorni</span> per lo streak di {currentStreak + pointsToNextMilestone}!
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="bg-white text-purple-600 hover:bg-white/90 flex-shrink-0"
                        onClick={onAction}
                    >
                        Continua
                    </Button>
                </div>
            </div>
        );
    }

    // Show active streak (compact version)
    if (isActiveToday) {
        return (
            <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl p-3 text-white shadow-md">
                <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    <span className="font-bold">{currentStreak} giorni di fila!</span>
                    <span className="text-white/80 text-sm ml-auto">Oggi: ✓</span>
                </div>
            </div>
        );
    }

    // Default: show streak with reminder
    return (
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-slate-800">Streak: {currentStreak} giorni 🔥</h3>
                    <p className="text-slate-600 text-sm">
                        {daysUntilStreakBreaks} giorni rimasti per mantenere lo streak
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={onAction}
                >
                    <Clock className="w-4 h-4 mr-1" />
                    Attiva
                </Button>
            </div>
        </div>
    );
}
