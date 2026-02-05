import { useStreakStatus } from '../../hooks/useStreak';
import { Flame, Check, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, subDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

export function StreakCalendar() {
    const { data: streak, isLoading } = useStreakStatus();

    if (isLoading || !streak) {
        return (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse">
                <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
        );
    }

    const { currentStreak, longestStreak, lastActiveDate, isActiveToday } = streak;

    // Generate last 14 days
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(today, 13 - i);
        return {
            date,
            isToday: isSameDay(date, today),
            isActive: isSameDay(date, lastActiveDate ? new Date(lastActiveDate) : new Date(0)) && isActiveToday,
            dayName: format(date, 'EEE', { locale: it }).charAt(0).toUpperCase(),
        };
    });

    // Adjust to show active days based on streak
    // Simple logic: mark last N days as active where N = currentStreak
    for (let i = 0; i < Math.min(currentStreak, 14); i++) {
        const dayIndex = days.length - 1 - i;
        if (dayIndex >= 0) {
            days[dayIndex].isActive = true;
        }
    }

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Flame className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Streak attuale</h3>
                        <p className="text-sm text-slate-500">{currentStreak} giorni consecutivi</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500">Record</p>
                    <p className="font-bold text-slate-800">{longestStreak} giorni</p>
                </div>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex flex-col items-center p-2 rounded-lg transition-colors",
                            day.isToday && "ring-2 ring-primary ring-offset-1",
                            day.isActive
                                ? "bg-orange-500 text-white"
                                : "bg-slate-100 text-slate-400"
                        )}
                    >
                        <span className="text-xs font-medium mb-1">{day.dayName}</span>
                        <div className="w-6 h-6 flex items-center justify-center">
                            {day.isActive ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Circle className="w-3 h-3" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Milestones */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Prossimi milestone:</p>
                <div className="flex gap-2">
                    {[3, 7, 14, 30].map((milestone) => (
                        <div
                            key={milestone}
                            className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium",
                                currentStreak >= milestone
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                            )}
                        >
                            {milestone}g
                            {currentStreak >= milestone && " ✓"}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
