/**
 * Zustand Auth Store
 * Global authentication state with localStorage for non-sensitive data
 */

import { create } from 'zustand';
import type { AuthState, LoginRequest, User } from '@/types';
import { authService } from '@/services/auth.service';

// Initialize user from localStorage (non-sensitive display data)
function initializeUserFromStorage(): User | null {
  return authService.getStoredUser();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initializeUserFromStorage(),
  accessToken: null, // Access token stays in memory in auth service
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  /**
   * Login action
   */
  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(credentials);

      set({
        user: response.user,
        accessToken: response.access,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';

      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  },

  /**
   * Logout action
   */
  logout: () => {
    authService.logout();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  /**
   * Refresh token action
   */
  refreshToken: async () => {
    try {
      const newAccessToken = await authService.refreshToken();
      set({ accessToken: newAccessToken });
    } catch (error) {
      // If refresh fails, logout user
      get().logout();
      throw error;
    }
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));

// Initialize auth state on app load
authService.initializeAuth()
  .then(() => {
    const user = authService.getStoredUser();
    const isAuth = authService.isAuthenticated();
    
    if (user && isAuth) {
      useAuthStore.setState({
        user,
        isAuthenticated: true,
      });
    }
  })
  .catch((error) => {
    console.error('Failed to initialize auth state:', error);
  });

export default useAuthStore;
