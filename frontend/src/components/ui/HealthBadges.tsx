interface HealthBadgesProps {
    nutriscore?: string;
    novaGroup?: number;
    ecoScore?: string;
    className?: string;
}

export function HealthBadges({ nutriscore, novaGroup, ecoScore, className }: HealthBadgesProps) {
    if (!nutriscore && !novaGroup && !ecoScore) return null;

    return (
        <div className={`flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-white/5 ${className ?? ''}`}>
            {nutriscore && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Nutri</span>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${nutriscore === 'A' ? 'bg-green-600' :
                        nutriscore === 'B' ? 'bg-green-500' :
                            nutriscore === 'C' ? 'bg-yellow-500' :
                                nutriscore === 'D' ? 'bg-orange-500' :
                                    nutriscore === 'E' ? 'bg-red-500' : 'bg-gray-400'
                        } text-white`}>
                        {nutriscore}
                    </span>
                </div>
            )}
            {novaGroup && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Nova</span>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${novaGroup === 1 ? 'bg-green-600' :
                        novaGroup === 2 ? 'bg-yellow-500' :
                            novaGroup === 3 ? 'bg-orange-500' :
                                novaGroup === 4 ? 'bg-red-500' : 'bg-gray-400'
                        } text-white`}>
                        {novaGroup}
                    </span>
                </div>
            )}
            {ecoScore && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Eco</span>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${ecoScore === 'A' ? 'bg-green-600' :
                        ecoScore === 'B' ? 'bg-green-500' :
                            ecoScore === 'C' ? 'bg-yellow-500' :
                                ecoScore === 'D' ? 'bg-orange-500' :
                                    ecoScore === 'E' ? 'bg-red-500' : 'bg-gray-400'
                        } text-white`}>
                        {ecoScore}
                    </span>
                </div>
            )}
        </div>
    );
}
