import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationApi } from '../api/client';
import { useAuth } from './useApi';

// Get gamification profile
export function useGamificationProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['gamification-profile', user?.id],
        queryFn: () => gamificationApi.getProfile(user!.id),
        enabled: !!user?.id,
    });
}

// Get AI unlock status
export function useAIStatus() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['ai-status', user?.id],
        queryFn: () => gamificationApi.getAIStatus(user!.id),
        enabled: !!user?.id,
    });
}

// Get household leaderboard
export function useLeaderboard() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['leaderboard', household?.id],
        queryFn: () => gamificationApi.getLeaderboard(household!.id),
        enabled: !!household?.id,
    });
}

// Track activity mutation
export function useTrackActivity() {
    const queryClient = useQueryClient();
    const { user, household } = useAuth();

    return useMutation({
        mutationFn: (type: 'SCAN' | 'COOK' | 'RECIPE_CREATE') =>
            gamificationApi.trackActivity({
                userId: user!.id,
                householdId: household!.id,
                type,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
            queryClient.invalidateQueries({ queryKey: ['ai-status'] });
        },
    });
}

// Update streak mutation
export function useUpdateStreak() {
    const queryClient = useQueryClient();
    const { user, household } = useAuth();

    return useMutation({
        mutationFn: () =>
            gamificationApi.updateStreak({
                userId: user!.id,
                householdId: household!.id,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
        },
    });
}
