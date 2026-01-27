/**
 * Authentication Service
 * Uses memory for access tokens and HttpOnly cookies (backend-managed) for refresh tokens
 */

import { apiClient, setAuthTokenGetter } from './axios';
import type { LoginRequest, LoginResponse, TokenRefreshResponse, User } from '@/types';
import { AUTH_CONFIG } from '@/utils/constants';

// In-memory storage for access token (most secure - cleared on page close)
let accessTokenMemory: string | null = null;

class AuthService {
  /**
   * Login user with matricule and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 Attempting login to:', AUTH_CONFIG.LOGIN_ENDPOINT);
      
      const response = await apiClient.post<LoginResponse>(
        AUTH_CONFIG.LOGIN_ENDPOINT,
        credentials,
        {
          withCredentials: true, // Important: allows backend to set HttpOnly cookies
        }
      );

      console.log('✅ Login successful');

      // Store access token in memory (most secure)
      if (response.data.access) {
        accessTokenMemory = response.data.access;
      }

      // Backend should set refresh_token as HttpOnly cookie automatically
      // We don't handle it here - it's invisible to JavaScript

      // Store user display data in localStorage (non-sensitive)
      if (response.data.user) {
        // Transform backend user data
        const user = response.data.user;
        const [firstName, ...lastNameParts] = (user.full_name || '').split(' ');
        const lastName = lastNameParts.join(' ');
        
        // Transform role string to roles array for frontend compatibility
        const transformedUser = {
          ...user,
          roles: user.role ? [user.role] : [],
          firstName: firstName || '',
          lastName: lastName || '',
        };
        
        // Update the response with transformed user
        response.data.user = transformedUser;
        
        const userDisplay = {
          id: user.id,
          matricule: user.matricule,
          firstName: firstName || '',
          lastName: lastName || '',
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        };
        localStorage.setItem(
          AUTH_CONFIG.STORAGE_KEY.USER_DISPLAY,
          JSON.stringify(userDisplay)
        );
      }

      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            data?: { detail?: string; message?: string };
            status?: number;
          };
          message?: string;
        };
        
        if (!axiosError.response) {
          throw new Error('Cannot connect to server. Please check if the backend is running on http://localhost:8000');
        }
        
        throw new Error(
          axiosError.response?.data?.detail ||
          axiosError.response?.data?.message ||
          'Login failed. Please check your credentials.'
        );
      }
      
      const err = error as Error;
      throw new Error(err.message || 'Network error. Please try again.');
    }
  }

  /**
   * Logout user and clear stored data
   */
  logout(): void {
    // Clear in-memory token
    accessTokenMemory = null;
    
    // Clear localStorage (non-sensitive data)
    localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY.USER_DISPLAY);
    
    // HttpOnly cookie (refresh_token) will be cleared by backend
    // Call backend logout endpoint to clear the cookie
    apiClient.post('/api/v1/auth/logout/', {}, { withCredentials: true })
      .catch(err => console.error('Logout error:', err));
  }

  /**
   * Refresh access token using HttpOnly refresh token cookie
   */
  async refreshToken(): Promise<string> {
    try {
      // Backend reads refresh_token from HttpOnly cookie automatically
      const response = await apiClient.post<TokenRefreshResponse>(
        AUTH_CONFIG.REFRESH_ENDPOINT,
        {}, // Empty body - refresh token comes from HttpOnly cookie
        { withCredentials: true } // Important: sends cookies with request
      );

      // Store new access token in memory
      accessTokenMemory = response.data.access;

      return response.data.access;
    } catch (error) {
      // Clear all auth data on refresh failure
      this.logout();
      throw error;
    }
  }

  /**
   * Get stored user display data (non-sensitive)
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY.USER_DISPLAY);
      if (!userStr) return null;
      
      const userData = JSON.parse(userStr);
      // Transform role string to roles array for consistency
      return {
        ...userData,
        roles: userData.role ? [userData.role] : [],
        permissions: userData.permissions || [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get stored access token from memory
   */
  getStoredAccessToken(): string | null {
    return accessTokenMemory;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    // Check if we have access token in memory OR user display data
    // If user display exists, we can try to refresh the access token
    const hasAccessToken = !!accessTokenMemory;
    const hasUserData = !!localStorage.getItem(AUTH_CONFIG.STORAGE_KEY.USER_DISPLAY);
    return hasAccessToken || hasUserData;
  }

  /**
   * Initialize auth state from cookies (on app load)
   */
  async initializeAuth(): Promise<void> {
    try {
      // Check if we have user data (means user was logged in)
      const userData = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY.USER_DISPLAY);
      
      if (userData && !accessTokenMemory) {
        // Try to refresh the access token using HttpOnly cookie
        await this.refreshToken();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.logout();
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Set up token getter for axios interceptor
setAuthTokenGetter(() => authService.getStoredAccessToken());

export default authService;
