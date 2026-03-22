import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesChannelService } from '@/services/salesChannel.service';
import type { CreateSalesChannelRequest } from '@/types';

// Query Keys
export const salesChannelsKeys = {
  all: ['salesChannels'] as const,
  lists: () => [...salesChannelsKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...salesChannelsKeys.lists(), filters] as const,
  details: () => [...salesChannelsKeys.all, 'detail'] as const,
  detail: (id: number) => [...salesChannelsKeys.details(), id] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all sales channels
 */
export function useSalesChannels() {
  return useQuery({
    queryKey: salesChannelsKeys.lists(),
    queryFn: () => salesChannelService.getAllChannels(),
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
  });
}

/**
 * Fetch single sales channel by ID
 */
export function useSalesChannel(id: number) {
  return useQuery({
    queryKey: salesChannelsKeys.detail(id),
    queryFn: () => salesChannelService.getChannelById(id),
    enabled: !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new sales channel
 */
export function useCreateSalesChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesChannelRequest) => 
      salesChannelService.createChannel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesChannelsKeys.lists() });
    },
  });
}

/**
 * Update existing sales channel
 */
export function useUpdateSalesChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateSalesChannelRequest }) =>
      salesChannelService.updateChannel(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: salesChannelsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: salesChannelsKeys.lists() });
    },
  });
}

/**
 * Delete sales channel
 */
export function useDeleteSalesChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => salesChannelService.deleteChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesChannelsKeys.lists() });
    },
  });
}
