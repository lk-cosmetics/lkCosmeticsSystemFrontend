/**
 * Role Service
 * Handles role CRUD operations
 */

import { apiClient } from './axios';
import { AUTH_CONFIG } from '@/utils/constants';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  PaginatedResponse,
} from '@/types';

export interface RoleFilters {
  search?: string;
  ordering?: string;
  page?: number;
}

class RoleService {
  /**
   * Get all roles with optional filters
   */
  async getRoles(filters?: RoleFilters): Promise<PaginatedResponse<Role>> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());

    const response = await apiClient.get<PaginatedResponse<Role>>(
      `${AUTH_CONFIG.ROLE_ENDPOINT}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get all roles without pagination (for dropdowns)
   */
  async getAllRoles(): Promise<Role[]> {
    const response = await apiClient.get<PaginatedResponse<Role>>(
      `${AUTH_CONFIG.ROLE_ENDPOINT}?page_size=100`
    );
    return response.data.results;
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: number): Promise<Role> {
    const response = await apiClient.get<Role>(
      `${AUTH_CONFIG.ROLE_ENDPOINT}${id}/`
    );
    return response.data;
  }

  /**
   * Create a new role
   */
  async createRole(data: CreateRoleRequest): Promise<Role> {
    const response = await apiClient.post<Role>(
      AUTH_CONFIG.ROLE_ENDPOINT,
      data
    );
    return response.data;
  }

  /**
   * Update role (full update)
   */
  async updateRole(id: number, data: UpdateRoleRequest): Promise<Role> {
    const response = await apiClient.put<Role>(
      `${AUTH_CONFIG.ROLE_ENDPOINT}${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Partial update role
   */
  async patchRole(id: number, data: Partial<UpdateRoleRequest>): Promise<Role> {
    const response = await apiClient.patch<Role>(
      `${AUTH_CONFIG.ROLE_ENDPOINT}${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Delete role
   */
  async deleteRole(id: number): Promise<void> {
    await apiClient.delete(`${AUTH_CONFIG.ROLE_ENDPOINT}${id}/`);
  }
}

export const roleService = new RoleService();
