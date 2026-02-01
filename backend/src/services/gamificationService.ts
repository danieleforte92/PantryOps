import prisma from '../lib/prisma';

// Badge definitions
export const BADGE_DEFINITIONS = {
    FIRST_COOK: { points: 30, icon: '🍳' },
    FIRST_SCAN: { points: 20, icon: '🔍' },
    CHEF: { points: 25, icon: '✍️' },
    AI_UNLOCKED: { points: 0, icon: '🤖' },
};

// Track activity and award points
export async function trackActivity(
    userId: string,
    householdId: string,
    type: 'SCAN' | 'COOK' | 'RECIPE_CREATE',
    metadata?: Record<string, any>
) {
    const pointsMap: Record<string, number> = {
        SCAN: 15,
        COOK: 30,
        RECIPE_CREATE: 25,
    };

    const points = pointsMap[type] || 5;

    const profile = await prisma.userGamificationProfile.upsert({
        where: { userId },
        create: {
            userId,
            householdId,
            totalPoints: points,
            recipesCooked: type === 'COOK' ? 1 : 0,
            recipesCreated: type === 'RECIPE_CREATE' ? 1 : 0,
            mealsSaved: type === 'COOK' ? 1 : 0,
        },
        update: {
            totalPoints: { increment: points },
            ...(type === 'COOK' && {
                recipesCooked: { increment: 1 },
                mealsSaved: { increment: 1 },
            }),
            ...(type === 'RECIPE_CREATE' && {
                recipesCreated: { increment: 1 },
            }),
        },
    });

    // Check for badge awards
    const newBadges = await checkAndAwardBadges(userId, profile);

    return {
        pointsEarned: points,
        totalPoints: profile.totalPoints,
        newBadges,
    };
}

// Check and award badges
async function checkAndAwardBadges(userId: string, profile: { id: string; totalPoints: number; recipesCooked: number; recipesCreated: number }) {
    const newBadges: string[] = [];

    // Check FIRST_COOK
    if (profile.recipesCooked >= 1) {
        const exists = await prisma.badge.findFirst({
            where: { userId: profile.id, type: 'FIRST_COOK' },
        });
        if (!exists) {
            await prisma.badge.create({
                data: { userId: profile.id, type: 'FIRST_COOK' },
            });
            newBadges.push('FIRST_COOK');
        }
    }

    // Check CHEF
    if (profile.recipesCreated >= 1) {
        const exists = await prisma.badge.findFirst({
            where: { userId: profile.id, type: 'CHEF' },
        });
        if (!exists) {
            await prisma.badge.create({
                data: { userId: profile.id, type: 'CHEF' },
            });
            newBadges.push('CHEF');
        }
    }

    // Check AI_UNLOCKED
    if (profile.totalPoints >= 500) {
        const exists = await prisma.badge.findFirst({
            where: { userId: profile.id, type: 'AI_UNLOCKED' },
        });
        if (!exists) {
            await prisma.badge.create({
                data: { userId: profile.id, type: 'AI_UNLOCKED' },
            });
            newBadges.push('AI_UNLOCKED');
        }
    }

    return newBadges;
}

// Check if user can use AI recipes
export async function checkAIAccess(userId: string): Promise<boolean> {
    const profile = await prisma.userGamificationProfile.findUnique({
        where: { userId },
    });

    return (profile?.totalPoints || 0) >= 500;
}

// Update daily streak
export async function updateStreak(userId: string, householdId: string) {
    const profile = await prisma.userGamificationProfile.findUnique({
        where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!profile) {
        await prisma.userGamificationProfile.create({
            data: {
                userId,
                householdId,
                currentStreak: 1,
                longestStreak: 1,
                lastActiveDate: today,
            },
        });
        return { currentStreak: 1, longestStreak: 1, newBadges: [] };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let currentStreak = profile.currentStreak;
    const lastActive = profile.lastActiveDate;

    if (!lastActive) {
        currentStreak = 1;
    } else {
        const lastActiveDate = new Date(lastActive);
        lastActiveDate.setHours(0, 0, 0, 0);

        if (lastActiveDate.getTime() === today.getTime()) {
            // Already active today
        } else if (lastActiveDate.getTime() === yesterday.getTime()) {
            currentStreak += 1;
        } else {
            currentStreak = 1;
        }
    }

    await prisma.userGamificationProfile.update({
        where: { userId },
        data: {
            currentStreak,
            longestStreak: Math.max(currentStreak, profile.longestStreak),
            lastActiveDate: today,
        },
    });

    // Check streak badges
    const newBadges: string[] = [];
    if (currentStreak === 3) {
        const exists = await prisma.badge.findFirst({
            where: { userId: profile.id, type: 'STREAK_3' },
        });
        if (!exists) {
            await prisma.badge.create({
                data: { userId: profile.id, type: 'STREAK_3' },
            });
            newBadges.push('STREAK_3');
        }
    }

    return { currentStreak, longestStreak: Math.max(currentStreak, profile.longestStreak), newBadges };
}
