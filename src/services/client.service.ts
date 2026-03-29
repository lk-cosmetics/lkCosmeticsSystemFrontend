/**
 * Client Service – CRUD for the /api/v1/clients/ endpoint.
 */

import { apiClient } from './axios';
import type { Client, CreateClientRequest, PaginatedResponse } from '@/types';

export interface ClientListParams {
  company?: number;
  source?: string;
  scope?: string;
  sales_channel?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const clientService = {
  async getAll(params?: ClientListParams) {
    const { data } = await apiClient.get<PaginatedResponse<Client> | Client[]>(
      '/api/v1/clients/',
      { params }
    );
    return data;
  },

  async getById(id: number) {
    const { data } = await apiClient.get<Client>(`/api/v1/clients/${id}/`);
    return data;
  },

  async create(payload: CreateClientRequest) {
    const { data } = await apiClient.post<Client>('/api/v1/clients/', payload);
    return data;
  },

  async update(id: number, payload: Partial<CreateClientRequest>) {
    const { data } = await apiClient.patch<Client>(
      `/api/v1/clients/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    await apiClient.delete(`/api/v1/clients/${id}/`);
  },

  async setBlocked(id: number, is_blocked: boolean) {
    const { data } = await apiClient.patch<Client>(
      `/api/v1/clients/${id}/block/`,
      { is_blocked }
    );
    return data;
  },
};
