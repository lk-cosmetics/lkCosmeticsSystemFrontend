import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionService } from '@/services/promotion.service';
import type { 
  CreatePromotionRequest, 
  UpdatePromotionRequest 
} from '@/types';

// Query Keys
export const promotionsKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionsKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...promotionsKeys.lists(), filters] as const,
  details: () => [...promotionsKeys.all, 'detail'] as const,
  detail: (id: number) => [...promotionsKeys.details(), id] as const,
  channelRules: (id: number) => [...promotionsKeys.detail(id), 'channelRules'] as const,
  analytics: (id: number) => [...promotionsKeys.detail(id), 'analytics'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all promotions
 */
export function usePromotions() {
  return useQuery({
    queryKey: promotionsKeys.lists(),
    queryFn: () => promotionService.getAllPromotions(),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Fetch single promotion by ID
 */
export function usePromotion(id: number) {
  return useQuery({
    queryKey: promotionsKeys.detail(id),
    queryFn: () => promotionService.getPromotionById(id),
    enabled: !!id,
  });
}

/**
 * Fetch channel rules for a promotion
 */
export function usePromotionChannelRules(id: number) {
  return useQuery({
    queryKey: promotionsKeys.channelRules(id),
    queryFn: () => promotionService.getChannelRules(id),
    enabled: !!id,
  });
}

/**
 * Fetch analytics for a promotion
 */
export function usePromotionAnalytics() {
  return useQuery({
    queryKey: promotionsKeys.all,
    queryFn: () => promotionService.getAnalytics(),
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new promotion
 */
export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePromotionRequest) => promotionService.createPromotion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Update existing promotion
 */
export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePromotionRequest }) =>
      promotionService.updatePromotion(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Delete promotion
 */
export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.deletePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Activate promotion
 */
export function useActivatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.activatePromotion(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Deactivate promotion
 */
export function useDeactivatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.deactivatePromotion(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Duplicate promotion
 */
export function useDuplicatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => promotionService.duplicatePromotion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Calculate discount for a product
 */
export function useCalculateDiscount() {
  return useMutation({
    mutationFn: (data: { promotion_id: number; sales_channel_id: number; product_id: number }) =>
      promotionService.calculateDiscount(data),
  });
}

/**
 * Bulk activate promotions
 */
export function useBulkActivatePromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => promotionService.bulkActivate(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Bulk deactivate promotions
 */
export function useBulkDeactivatePromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => promotionService.bulkDeactivate(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}

/**
 * Bulk delete promotions
 */
export function useBulkDeletePromotions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => promotionService.bulkDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionsKeys.lists() });
    },
  });
}
