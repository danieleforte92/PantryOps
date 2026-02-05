import { useQuery } from '@tanstack/react-query';
import { gamificationApi } from '../api/client';
import { useAuth } from './useApi';

// Get detailed streak status
export function useStreakStatus() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['streak-status', user?.id],
        queryFn: () => gamificationApi.getStreakStatus(user!.id),
        enabled: !!user?.id,
        refetchInterval: 60000, // Refetch every minute to keep status updated
    });
}
