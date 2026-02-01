import { useEffect, useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AchievementToast {
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    points: number;
}

interface AchievementToastProps {
    achievements: AchievementToast[];
    onDismiss: (id: string) => void;
}

export function AchievementToastContainer({ achievements, onDismiss }: AchievementToastProps) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
            {achievements.map((achievement) => (
                <AchievementToastItem
                    key={achievement.id}
                    achievement={achievement}
                    onDismiss={() => onDismiss(achievement.id)}
                />
            ))}
        </div>
    );
}

function AchievementToastItem({
    achievement,
    onDismiss,
}: {
    achievement: AchievementToast;
    onDismiss: () => void;
}) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 100);

        // Auto dismiss after 5 seconds
        const dismissTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearTimeout(dismissTimer);
        };
    }, [onDismiss]);

    return (
        <div
            className={cn(
                "bg-white rounded-2xl shadow-2xl border-l-4 border-primary p-4 min-w-[320px] max-w-[400px] transition-all duration-300 transform",
                isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            )}
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-2xl">{achievement.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">
                            Nuovo Badge!
                        </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">
                        {achievement.name}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">
                        {achievement.description}
                    </p>
                    {achievement.points > 0 && (
                        <p className="text-sm font-semibold text-primary mt-2">
                            +{achievement.points} punti
                        </p>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onDismiss, 300);
                    }}
                    className="p-1 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>
        </div>
    );
}

// Hook to manage achievement toasts
export function useAchievementToasts() {
    const [toasts, setToasts] = useState<AchievementToast[]>([]);

    const addToast = (achievement: Omit<AchievementToast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { ...achievement, id }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, removeToast };
}
