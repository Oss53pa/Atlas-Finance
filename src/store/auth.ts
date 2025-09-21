import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthResponse } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (authResponse: AuthResponse) => void;
  logout: () => void;
  refreshAccessToken: (newAccessToken: string) => void;
  updateUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: (authResponse: AuthResponse) => {
        set({
          user: authResponse.user,
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        
        // Clear all localStorage data
        localStorage.removeItem('bookwise-auth-storage');
        
        // Redirect to login page
        window.location.href = '/login';
      },

      refreshAccessToken: (newAccessToken: string) => {
        set({ accessToken: newAccessToken });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'bookwise-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate token on app startup
          const now = Date.now();
          const tokenPayload = state.accessToken ? JSON.parse(atob(state.accessToken.split('.')[1])) : null;
          
          if (!tokenPayload || tokenPayload.exp * 1000 < now) {
            // Token is expired, clear auth state
            state.logout();
          }
        }
      },
    }
  )
);