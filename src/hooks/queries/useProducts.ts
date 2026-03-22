import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import type {
  CreateProductRequest,
  UpdateProductRequest,
  PaginatedResponse,
  ProductListItem,
} from '@/types';

// Query Keys
export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...productsKeys.lists(), filters] as const,
  infinite: (filters?: Record<string, unknown>) => [...productsKeys.all, 'infinite', filters] as const,
  details: () => [...productsKeys.all, 'detail'] as const,
  detail: (id: number) => [...productsKeys.details(), id] as const,
};

type ProductsInfinitePageParam = {
  page?: number;
  offset?: number;
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all products (no pagination)
 */
export function useProducts() {
  return useQuery({
    queryKey: productsKeys.lists(),
    queryFn: () => productService.getAllProducts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch products with server-side pagination and filters
 */
export function useProductsPaginated(params: {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sales_channel?: number;
  brand?: number;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  inventory_status?: 'instock' | 'outofstock' | 'onbackorder';
  ordering?: string;
}) {
  return useQuery({
    queryKey: productsKeys.list(params as Record<string, unknown>),
    queryFn: () => productService.getProductsPaginated(params),
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch products with infinite scrolling
 */
export function useInfiniteProducts(params: {
  page_size?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sales_channel?: number;
  brand?: number;
  status?: 'publish' | 'draft' | 'pending' | 'private';
  inventory_status?: 'instock' | 'outofstock' | 'onbackorder';
  ordering?: string;
  enabled?: boolean;
}) {
  const resolveNextPageParam = (
    nextUrl: string | null
  ): ProductsInfinitePageParam | undefined => {
    if (!nextUrl) return undefined;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(nextUrl, window.location.origin);
    } catch {
      return undefined;
    }

    const page = parsedUrl.searchParams.get('page');
    if (page) {
      return { page: Number(page) };
    }

    const offset = parsedUrl.searchParams.get('offset');
    if (offset) {
      return { offset: Number(offset) };
    }

    return undefined;
  };

  // Extract enabled flag separately (React Query configuration)
  const { enabled = true, ...queryParams } = params;

  return useInfiniteQuery<
    PaginatedResponse<ProductListItem>,
    Error,
    InfiniteData<PaginatedResponse<ProductListItem>, ProductsInfinitePageParam>,
    ReturnType<typeof productsKeys.infinite>,
    ProductsInfinitePageParam
  >({
    queryKey: productsKeys.infinite(queryParams),
    queryFn: async ({ pageParam = { page: 1 } }) => {
      return productService.getProductsPaginated({
        ...queryParams,
        ...(pageParam.page !== undefined ? { page: pageParam.page } : {}),
        ...(pageParam.offset !== undefined ? { offset: pageParam.offset } : {}),
      });
    },
    initialPageParam: { page: 1 },
    getNextPageParam: (lastPage) => {
      return resolveNextPageParam(lastPage.next);
    },
    staleTime: 30 * 1000,
    enabled,
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
    mutationFn: (data: CreateProductRequest) => productService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}

/**
 * Partial update existing product
 */
export function usePartialUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UpdateProductRequest> }) =>
      productService.partialUpdateProduct(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productsKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
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
    mutationFn: ({ salesChannelId, wcProductIds }: { salesChannelId: number; wcProductIds: number[] }) => 
      productService.syncSelectedFromWooCommerce(salesChannelId, wcProductIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });
}
