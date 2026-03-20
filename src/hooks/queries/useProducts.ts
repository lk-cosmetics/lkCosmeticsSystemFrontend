import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import type { CreateProductRequest, UpdateProductRequest } from '@/types';

// Query Keys
export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...productsKeys.lists(), filters] as const,
  details: () => [...productsKeys.all, 'detail'] as const,
  detail: (id: number) => [...productsKeys.details(), id] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all products
 */
export function useProducts() {
  return useQuery({
    queryKey: productsKeys.lists(),
    queryFn: () => productService.getAllProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch single product by ID
 */
export function useProduct(id: number) {
  return useQuery({
    queryKey: productsKeys.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductRequest) =>
      productService.createProduct(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Update existing product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductRequest }) =>
      productService.updateProduct(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productsKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Partial update existing product
 */
export function usePartialUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<UpdateProductRequest>;
    }) => productService.partialUpdateProduct(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productsKeys.detail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Delete product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Bulk delete products
 */
export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Delete products one by one
      const results = await Promise.allSettled(
        ids.map(id => productService.deleteProduct(id))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      return { successCount, errorCount, total: ids.length };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Sync products from WooCommerce
 */
export function useSyncProductsFromWooCommerce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (salesChannelId: number) =>
      productService.syncFromWooCommerce(salesChannelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}

/**
 * Preview products from WooCommerce
 */
export function usePreviewProductsFromWooCommerce() {
  return useMutation({
    mutationFn: (salesChannelId: number) =>
      productService.previewFromWooCommerce(salesChannelId),
  });
}

/**
 * Sync selected products from WooCommerce
 */
export function useSyncSelectedProductsFromWooCommerce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      salesChannelId,
      wcProductIds,
    }: {
      salesChannelId: number;
      wcProductIds: number[];
    }) =>
      productService.syncSelectedFromWooCommerce(salesChannelId, wcProductIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
    },
  });
}
