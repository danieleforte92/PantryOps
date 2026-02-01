import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queriesApi, stockApi } from '../api/client';
import { useAuth } from './useApi';

// Get tutorial products
export function useTutorialProducts() {
    const { household } = useAuth();

    return useQuery({
        queryKey: ['tutorial-products', household?.id],
        queryFn: () => queriesApi.getTutorialProducts(household!.id),
        enabled: !!household?.id,
    });
}

// Convert tutorial product to real
export function useConvertTutorial() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: ({ lotId, bestBeforeDate }: { lotId: string; bestBeforeDate: string }) =>
            stockApi.convertTutorial(lotId, {
                bestBeforeDate,
                userId: user!.id,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tutorial-products'] });
            queryClient.invalidateQueries({ queryKey: ['current-stock'] });
            queryClient.invalidateQueries({ queryKey: ['expiring'] });
            queryClient.invalidateQueries({ queryKey: ['gamification-profile'] });
        },
    });
}
