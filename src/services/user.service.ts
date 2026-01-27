/**
 * User Service
 * Handles user profile management and password changes
 */

import { apiClient } from './axios';
import { AUTH_CONFIG } from '@/utils/constants';
import type { UserDetails, UpdateUserRequest, ChangePasswordRequest } from '@/types';

class UserService {
  /**
   * Get current authenticated user details
   */
  async getCurrentUser(): Promise<UserDetails> {
    const response = await apiClient.get<UserDetails>(
      `${AUTH_CONFIG.USER_ENDPOINT}me/`
    );
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserDetails> {
    const response = await apiClient.get<UserDetails>(
      `${AUTH_CONFIG.USER_ENDPOINT}${id}/`
    );
    return response.data;
  }

  /**
   * Update user profile (partial update)
   */
  async updateUser(id: number, data: UpdateUserRequest): Promise<UserDetails> {
    const response = await apiClient.patch<UserDetails>(
      `${AUTH_CONFIG.USER_ENDPOINT}${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Change user password
   */
  async changePassword(id: number, data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      `${AUTH_CONFIG.USER_ENDPOINT}${id}/change_password/`,
      data
    );
    return response.data;
  }
}

export const userService = new UserService();
