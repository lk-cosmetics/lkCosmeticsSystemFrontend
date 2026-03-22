/**
 * Product Service
 * Handles all product-related API calls
 */

import { apiClient } from './axios';
import type {
  Product,
  ProductListItem,
  CreateProductRequest,
  UpdateProductRequest,
  PaginatedResponse,
} from '@/types';

interface ProductQueryParams {
  sales_channel?: number;
  brand?: number;
  inventory_status?: 'instock' | 'outofstock' | 'onbackorder';
  product_type?: 'simple' | 'variable' | 'grouped' | 'external';
  status?: 'publish' | 'draft' | 'pending' | 'private';
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
  offset?: number;
  limit?: number;
}

interface SyncResponse {
  message: string;
  synced_count?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  errors?: string[];
}

interface WooCommerceProductPreview {
  wc_id: number;
  name: string;
  sku: string;
  price: string;
  sale_price: string;
  status: string;
  stock_status: string;
  stock_quantity: number | null;
  type: string;
  image: string;
  categories: string[];
  exists_locally: boolean;
}

interface WooCommercePreviewResponse {
  sales_channel: number;
  sales_channel_name: string;
  total_count: number;
  existing_count: number;
  new_count: number;
  products: WooCommerceProductPreview[];
}

const PRODUCT_ENDPOINT = '/api/v1/products/';

const shouldUseMultipart = (
  data:
    | CreateProductRequest
    | UpdateProductRequest
    | Partial<UpdateProductRequest>
) => {
  return data.image_upload instanceof File;
};

const buildProductFormData = (
  data:
    | CreateProductRequest
    | UpdateProductRequest
    | Partial<UpdateProductRequest>
) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key === 'image_upload' && value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => {
        formData.append(key, String(item));
      });
      return;
    }

    if (typeof value === 'object') {
      formData.append(key, JSON.stringify(value));
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
};

const normalizeProductQueryParams = (params?: ProductQueryParams): ProductQueryParams | undefined => {
  if (!params) return undefined;

  const normalized: ProductQueryParams = { ...params };

  // Support both pagination conventions: page/page_size and offset/limit.
  if (normalized.limit !== undefined && normalized.page_size === undefined) {
    normalized.page_size = normalized.limit;
  }

  if (normalized.page_size !== undefined && normalized.limit === undefined) {
    normalized.limit = normalized.page_size;
  }

  return normalized;
};

const normalizePaginatedResponse = <T>(
  data: PaginatedResponse<T> | T[]
): PaginatedResponse<T> => {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }

  if (data && Array.isArray(data.results)) {
    return data;
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
};

class ProductService {
  /**
   * Get all products (handles paginated response)
   */
  async getAllProducts(
    params?: ProductQueryParams
  ): Promise<ProductListItem[]> {
    const response = await apiClient.get<PaginatedResponse<ProductListItem> | ProductListItem[]>(
      PRODUCT_ENDPOINT,
      { params: normalizeProductQueryParams(params) }
    );
    return normalizePaginatedResponse(response.data).results;
  }

  /**
   * Get products with pagination info
   */
  async getProductsPaginated(
    params?: ProductQueryParams
  ): Promise<PaginatedResponse<ProductListItem>> {
    const response = await apiClient.get<PaginatedResponse<ProductListItem> | ProductListItem[]>(
      PRODUCT_ENDPOINT,
      { params: normalizeProductQueryParams(params) }
    );
    return normalizePaginatedResponse(response.data);
  }

  /**
   * Get products by sales channel
   */
  async getProductsBySalesChannel(
    salesChannelId: number
  ): Promise<ProductListItem[]> {
    return this.getAllProducts({ sales_channel: salesChannelId });
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brandId: number): Promise<ProductListItem[]> {
    return this.getAllProducts({ brand: brandId });
  }

  /**
   * Get product by ID
   */
  async getProductById(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(`${PRODUCT_ENDPOINT}${id}/`);
    return response.data;
  }

  /**
   * Create new product
   */
  async createProduct(data: CreateProductRequest): Promise<Product> {
    const payload = shouldUseMultipart(data)
      ? buildProductFormData(data)
      : data;
    const response = await apiClient.post<Product>(PRODUCT_ENDPOINT, payload);
    return response.data;
  }

  /**
   * Update product (full update)
   */
  async updateProduct(
    id: number,
    data: UpdateProductRequest
  ): Promise<Product> {
    const payload = shouldUseMultipart(data)
      ? buildProductFormData(data)
      : data;
    const response = await apiClient.put<Product>(
      `${PRODUCT_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  }

  /**
   * Partial update product
   */
  async partialUpdateProduct(
    id: number,
    data: Partial<UpdateProductRequest>
  ): Promise<Product> {
    const payload = shouldUseMultipart(data)
      ? buildProductFormData(data)
      : data;
    const response = await apiClient.patch<Product>(
      `${PRODUCT_ENDPOINT}${id}/`,
      payload
    );
    return response.data;
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`${PRODUCT_ENDPOINT}${id}/`);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(
    threshold: number = 10
  ): Promise<ProductListItem[]> {
    const response = await apiClient.get<PaginatedResponse<ProductListItem>>(
      `${PRODUCT_ENDPOINT}low_stock/`,
      { params: { threshold } }
    );
    if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return response.data as unknown as ProductListItem[];
  }

  /**
   * Get products on sale
   */
  async getProductsOnSale(): Promise<ProductListItem[]> {
    const response = await apiClient.get<PaginatedResponse<ProductListItem>>(
      `${PRODUCT_ENDPOINT}on_sale/`
    );
    if (response.data && 'results' in response.data) {
      return response.data.results;
    }
    return response.data as unknown as ProductListItem[];
  }

  /**
   * Sync products from WooCommerce
   */
  async syncFromWooCommerce(salesChannelId?: number): Promise<SyncResponse> {
    const response = await apiClient.post<SyncResponse>(
      `${PRODUCT_ENDPOINT}sync/`,
      salesChannelId ? { sales_channel: salesChannelId } : {}
    );
    return response.data;
  }

  /**
   * Preview products from WooCommerce (without saving)
   */
  async previewFromWooCommerce(
    salesChannelId: number
  ): Promise<WooCommercePreviewResponse> {
    const response = await apiClient.post<WooCommercePreviewResponse>(
      `${PRODUCT_ENDPOINT}preview/`,
      { sales_channel: salesChannelId }
    );
    return response.data;
  }

  /**
   * Sync selected products from WooCommerce
   */
  async syncSelectedFromWooCommerce(
    salesChannelId: number,
    wcProductIds: number[]
  ): Promise<SyncResponse> {
    const response = await apiClient.post<SyncResponse>(
      `${PRODUCT_ENDPOINT}sync-selected/`,
      { sales_channel: salesChannelId, wc_product_ids: wcProductIds }
    );
    return response.data;
  }

  /**
   * Search products
   */
  async searchProducts(
    query: string,
    params?: Omit<ProductQueryParams, 'search'>
  ): Promise<ProductListItem[]> {
    return this.getAllProducts({ ...params, search: query });
  }
}

export const productService = new ProductService();
