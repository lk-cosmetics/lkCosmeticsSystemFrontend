/**
 * Order Service – read orders + POS creation + status updates + WooCommerce sync.
 */

import { apiClient } from './axios';
import type {
  OrderDetail,
  POSOrderCreateRequest,
  OrderSummary,
  OrderStatus,
} from '@/types';

export interface OrderListParams {
  company?: number;
  sales_channel?: number;
  brand?: number;
  status?: OrderStatus;
  source?: string;
  payment_status?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface OrderSyncResponse {
  detail: string;
  created: number;
  updated: number;
  errors: number;
  total?: number;
}

export interface WooCommerceOrderPreview {
  wc_id: number;
  order_number: string;
  status: string;
  total: string;
  currency: string;
  customer_name: string;
  customer_email: string;
  line_items_count: number;
  date_created: string;
  payment_method_title: string;
  exists_locally: boolean;
}

export interface WooCommerceOrderPreviewResponse {
  sales_channel: number;
  sales_channel_name: string;
  total_count: number;
  existing_count: number;
  new_count: number;
  orders: WooCommerceOrderPreview[];
}

export const orderService = {
  /** List orders with filters. */
  async getAll(params?: OrderListParams) {
    const { data } = await apiClient.get('/api/v1/orders/', { params });
    return data;
  },

  /** Single order detail with line items. */
  async getById(id: number) {
    const { data } = await apiClient.get<OrderDetail>(`/api/v1/orders/${id}/`);
    return data;
  },

  /** POS / Manual order creation (Method B). */
  async createPOS(payload: POSOrderCreateRequest) {
    const { data } = await apiClient.post<OrderDetail>(
      '/api/v1/orders/pos/',
      payload
    );
    return data;
  },

  /** Patch order status. */
  async updateStatus(id: number, status: OrderStatus, internalNote?: string) {
    const { data } = await apiClient.patch<OrderDetail>(
      `/api/v1/orders/${id}/status/`,
      { status, internal_note: internalNote ?? '' }
    );
    return data;
  },

  /** Dashboard KPIs. */
  async getSummary(companyId?: number) {
    const params = companyId ? { company: companyId } : {};
    const { data } = await apiClient.get<OrderSummary>(
      '/api/v1/orders/summary/',
      { params }
    );
    return data;
  },

  /** Sync all orders from a WooCommerce channel. */
  async syncFromWooCommerce(
    salesChannelId: number
  ): Promise<OrderSyncResponse> {
    const { data } = await apiClient.post<OrderSyncResponse>(
      '/api/v1/orders/sync/',
      { sales_channel: salesChannelId },
      { timeout: 120_000 } // WooCommerce sync can be slow with many orders
    );
    return data;
  },

  /** Preview orders from WooCommerce without saving. */
  async previewFromWooCommerce(
    salesChannelId: number
  ): Promise<WooCommerceOrderPreviewResponse> {
    const { data } = await apiClient.post<WooCommerceOrderPreviewResponse>(
      '/api/v1/orders/preview/',
      { sales_channel: salesChannelId },
      { timeout: 120_000 }
    );
    return data;
  },

  /** Sync only selected WC orders by their IDs. */
  async syncSelectedFromWooCommerce(
    salesChannelId: number,
    wcOrderIds: number[]
  ): Promise<OrderSyncResponse> {
    const { data } = await apiClient.post<OrderSyncResponse>(
      '/api/v1/orders/sync-selected/',
      { sales_channel: salesChannelId, wc_order_ids: wcOrderIds },
      { timeout: 120_000 }
    );
    return data;
  },
};
