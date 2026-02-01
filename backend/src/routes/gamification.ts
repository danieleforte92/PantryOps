import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import prisma from '../lib/prisma';

// Badge definitions with requirements
const BADGE_DEFINITIONS = {
    WELCOME: {
        name: 'Benvenuto Chef',
        description: 'Hai completato l\'onboarding',
        points: 10,
        icon: '🎉',
    },
    FIRST_PRODUCTS: {
        name: 'Primi Passi',
        description: 'Aggiungi almeno 3 prodotti alla dispensa',
        points: 15,
        icon: '📦',
    },
    FIRST_SCAN: {
        name: 'Esploratore',
        description: 'Effettua il tuo primo scan',
        points: 20,
        icon: '🔍',
    },
    FIRST_COOK: {
        name: 'Prima Cottura',
        description: 'Cucina la tua prima ricetta',
        points: 30,
        icon: '🍳',
    },
    STREAK_3: {
        name: 'Chef Costante',
        description: 'Attivo per 3 giorni consecutivi',
        points: 40,
        icon: '🔥',
    },
    STREAK_7: {
        name: 'Chef Dedicato',
        description: 'Attivo per 7 giorni consecutivi',
        points: 80,
        icon: '🔥🔥',
    },
    STREAK_30: {
        name: 'Maestro Chef',
        description: 'Attivo per 30 giorni consecutivi',
        points: 200,
        icon: '👨‍🍳',
    },
    CHEF: {
        name: 'Creatore',
        description: 'Crea la tua prima ricetta',
        points: 25,
        icon: '✍️',
    },
    AI_UNLOCKED: {
        name: 'AI Chef',
        description: 'Sblocca la generazione ricette con AI',
        points: 0,
        icon: '🤖',
    },
    WASTE_WARRIOR: {
        name: 'Guerriero dello Spreco',
        description: 'Evita sprechi per una settimana',
        points: 50,
        icon: '🛡️',
    },
    MONEY_SAVER: {
        name: 'Risparmiatore',
        description: 'Risparmia 10€ evitando sprechi',
        points: 30,
        icon: '💰',
    },
};

// Schema for tracking activity
const trackActivitySchema = z.object({
    userId: z.string(),
    householdId: z.string(),
    type: z.enum(['SCAN', 'COOK', 'RECIPE_CREATE', 'STREAK_MANTAINED', 'DAILY_LOGIN']),
    metadata: z.record(z.any()).optional(),
});

export async function gamificationRoutes(app: FastifyInstance) {
    const fastify = app.withTypeProvider<ZodTypeProvider>();

    // Get user gamification profile
    fastify.get('/profile', {
        schema: {
            querystring: z.object({
                userId: z.string(),
            }),
        },
    }, async (request) => {
        const { userId } = request.query;

        const profile = await prisma.userGamificationProfile.findUnique({
            where: { userId },
            include: {
                badges: {
                    orderBy: { earnedAt: 'desc' },
                },
            },
        });

        if (!profile) {
            return {
                totalPoints: 0,
                currentStreak: 0,
                longestStreak: 0,
                mealsSaved: 0,
                recipesCreated: 0,
                recipesCooked: 0,
                badges: [],
                nextUnlock: {
                    points: 500,
                    feature: 'AI Recipe Generator',
                },
            };
        }

        // Map badges with definitions
        const badgesWithDetails = profile.badges.map((badge) => {
            const def = BADGE_DEFINITIONS[badge.type as keyof typeof BADGE_DEFINITIONS];
            return {
                ...badge,
                name: def?.name || badge.type,
                description: def?.description || '',
                icon: def?.icon || '🏆',
                points: def?.points || 0,
            };
        });

        // Check if AI is unlocked
        const aiUnlocked = profile.totalPoints >= 500;
        const hasAiBadge = badgesWithDetails.some((b) => b.type === 'AI_UNLOCKED');

        return {
            totalPoints: profile.totalPoints,
            currentStreak: profile.currentStreak,
            longestStreak: profile.longestStreak,
            lastActiveDate: profile.lastActiveDate,
            mealsSaved: profile.mealsSaved,
            recipesCreated: profile.recipesCreated,
            recipesCooked: profile.recipesCooked,
            tutorialProductsAdded: profile.tutorialProductsAdded,
            badges: badgesWithDetails,
            aiUnlocked,
            aiBadgeEarned: hasAiBadge,
            nextUnlock: aiUnlocked
                ? null
                : {
                      points: 500,
                      feature: 'AI Recipe Generator',
                      remaining: Math.max(0, 500 - profile.totalPoints),
                  },
        };
    });

    // Track activity and update points
    fastify.post('/track', {
        schema: {
            body: trackActivitySchema,
        },
    }, async (request) => {
        const { userId, householdId, type, metadata } = request.body;

        // Define points for each activity type
        const pointsMap: Record<string, number> = {
            SCAN: 15,
            COOK: 30,
            RECIPE_CREATE: 25,
            STREAK_MANTAINED: 10,
            DAILY_LOGIN: 5,
        };

        const points = pointsMap[type] || 5;

        // Update profile
        const profile = await prisma.userGamificationProfile.upsert({
            where: { userId },
            create: {
                userId,
                householdId,
                totalPoints: points,
                [type === 'COOK' ? 'recipesCooked' : type === 'RECIPE_CREATE' ? 'recipesCreated' : 'mealsSaved']:
                    type === 'COOK' ? 1 : type === 'RECIPE_CREATE' ? 1 : 0,
            },
            update: {
                totalPoints: { increment: points },
                ...(type === 'COOK' && { recipesCooked: { increment: 1 } }),
                ...(type === 'RECIPE_CREATE' && { recipesCreated: { increment: 1 } }),
                ...(type === 'COOK' && { mealsSaved: { increment: 1 } }),
            },
        });

        // Check for new badges
        const newBadges = await checkAndAwardBadges(userId, profile);

        return {
            message: 'Activity tracked',
            pointsEarned: points,
            totalPoints: profile.totalPoints,
            newBadges,
        };
    });

    // Get household leaderboard
    fastify.get('/household/:householdId/leaderboard', {
        schema: {
            params: z.object({
                householdId: z.string(),
            }),
        },
    }, async (request) => {
        const { householdId } = request.params;

        const profiles = await prisma.userGamificationProfile.findMany({
            where: { householdId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                badges: true,
            },
            orderBy: { totalPoints: 'desc' },
        });

        const leaderboard = profiles.map((profile, index) => ({
            rank: index + 1,
            userId: profile.userId,
            userName: profile.user.name || profile.user.email.split('@')[0],
            totalPoints: profile.totalPoints,
            badges: profile.badges.length,
            currentStreak: profile.currentStreak,
        }));

        return { leaderboard };
    });

    // Check for AI unlock status
    fastify.get('/ai-status', {
        schema: {
            querystring: z.object({
                userId: z.string(),
            }),
        },
    }, async (request) => {
        const { userId } = request.query;

        const profile = await prisma.userGamificationProfile.findUnique({
            where: { userId },
        });

        const totalPoints = profile?.totalPoints || 0;
        const unlocked = totalPoints >= 500;
        const hasBadge = await prisma.badge.findFirst({
            where: {
                userId: profile?.id || '',
                type: 'AI_UNLOCKED',
            },
        });

        // Award badge if unlocked but not yet awarded
        if (unlocked && !hasBadge && profile) {
            await prisma.badge.create({
                data: {
                    userId: profile.id,
                    type: 'AI_UNLOCKED',
                },
            });
        }

        return {
            unlocked,
            totalPoints,
            requiredPoints: 500,
            remainingPoints: Math.max(0, 500 - totalPoints),
        };
    });

    // Update streak (called daily or on login)
    fastify.post('/update-streak', {
        schema: {
            body: z.object({
                userId: z.string(),
                householdId: z.string(),
            }),
        },
    }, async (request) => {
        const { userId, householdId } = request.body;

        const profile = await prisma.userGamificationProfile.findUnique({
            where: { userId },
        });

        if (!profile) {
            // Create profile with initial streak
            const newProfile = await prisma.userGamificationProfile.create({
                data: {
                    userId,
                    householdId,
                    currentStreak: 1,
                    longestStreak: 1,
                    lastActiveDate: new Date(),
                },
            });

            return {
                currentStreak: newProfile.currentStreak,
                longestStreak: newProfile.longestStreak,
                newBadges: [],
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActive = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let currentStreak = profile.currentStreak;
        let newBadges: string[] = [];

        if (!lastActive) {
            // First activity
            currentStreak = 1;
        } else {
            const lastActiveDate = new Date(lastActive);
            lastActiveDate.setHours(0, 0, 0, 0);

            if (lastActiveDate.getTime() === today.getTime()) {
                // Already active today, no change
            } else if (lastActiveDate.getTime() === yesterday.getTime()) {
                // Consecutive day
                currentStreak += 1;
            } else {
                // Streak broken
                currentStreak = 1;
            }
        }

        // Update profile
        await prisma.userGamificationProfile.update({
            where: { userId },
            data: {
                currentStreak,
                longestStreak: Math.max(currentStreak, profile.longestStreak),
                lastActiveDate: today,
            },
        });

        // Check for streak badges
        if (currentStreak === 3) {
            const hasStreak3 = await prisma.badge.findFirst({
                where: {
                    userId: profile.id,
                    type: 'STREAK_3',
                },
            });
            if (!hasStreak3) {
                await prisma.badge.create({
                    data: {
                        userId: profile.id,
                        type: 'STREAK_3',
                    },
                });
                newBadges.push('STREAK_3');
            }
        }

        if (currentStreak === 7) {
            const hasStreak7 = await prisma.badge.findFirst({
                where: {
                    userId: profile.id,
                    type: 'STREAK_7',
                },
            });
            if (!hasStreak7) {
                await prisma.badge.create({
                    data: {
                        userId: profile.id,
                        type: 'STREAK_7',
                    },
                });
                newBadges.push('STREAK_7');
            }
        }

        return {
            currentStreak,
            longestStreak: Math.max(currentStreak, profile.longestStreak),
            newBadges,
        };
    });
}

// Helper function to check and award badges
async function checkAndAwardBadges(userId: string, profile: { id: string; totalPoints: number; recipesCooked: number; recipesCreated: number }) {
    const newBadges: Array<{ type: string; name: string; icon: string; points: number }> = [];

    // Check FIRST_COOK badge
    if (profile.recipesCooked >= 1) {
        const hasFirstCook = await prisma.badge.findFirst({
            where: {
                userId: profile.id,
                type: 'FIRST_COOK',
            },
        });
        if (!hasFirstCook) {
            await prisma.badge.create({
                data: {
                    userId: profile.id,
                    type: 'FIRST_COOK',
                },
            });
            newBadges.push({
                type: 'FIRST_COOK',
                name: BADGE_DEFINITIONS.FIRST_COOK.name,
                icon: BADGE_DEFINITIONS.FIRST_COOK.icon,
                points: BADGE_DEFINITIONS.FIRST_COOK.points,
            });
        }
    }

    // Check CHEF badge (recipe creation)
    if (profile.recipesCreated >= 1) {
        const hasChef = await prisma.badge.findFirst({
            where: {
                userId: profile.id,
                type: 'CHEF',
            },
        });
        if (!hasChef) {
            await prisma.badge.create({
                data: {
                    userId: profile.id,
                    type: 'CHEF',
                },
            });
            newBadges.push({
                type: 'CHEF',
                name: BADGE_DEFINITIONS.CHEF.name,
                icon: BADGE_DEFINITIONS.CHEF.icon,
                points: BADGE_DEFINITIONS.CHEF.points,
            });
        }
    }

    // Check AI_UNLOCKED badge
    if (profile.totalPoints >= 500) {
        const hasAi = await prisma.badge.findFirst({
            where: {
                userId: profile.id,
                type: 'AI_UNLOCKED',
            },
        });
        if (!hasAi) {
            await prisma.badge.create({
                data: {
                    userId: profile.id,
                    type: 'AI_UNLOCKED',
                },
            });
            newBadges.push({
                type: 'AI_UNLOCKED',
                name: BADGE_DEFINITIONS.AI_UNLOCKED.name,
                icon: BADGE_DEFINITIONS.AI_UNLOCKED.icon,
                points: BADGE_DEFINITIONS.AI_UNLOCKED.points,
            });
        }
    }

    return newBadges;
}
