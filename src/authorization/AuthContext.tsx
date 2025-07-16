import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, TokenManager, JWTUtils, type UserProfile, type LoginCredentials, type RegisterData } from '../services/authClient';

// Types
interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  isAuthenticated: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Using TokenManager from authClient.ts

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Auto-refresh tokens before expiry
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (TokenManager.isTokenExpired()) {
        await handleTokenRefresh();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const initializeAuth = async () => {
    try {
      setLoading(true);

      // First, try to restore user from localStorage
      const storedUser = TokenManager.getUserProfile();
      if (storedUser && TokenManager.hasValidToken()) {
        setUser(storedUser);
        setLoading(false);
        return;
      }

      // Check if we have valid tokens
      if (!TokenManager.hasValidToken()) {
        // Check if we have a refresh token to try refreshing
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          const refreshed = await handleTokenRefresh();
          if (refreshed) {
            await loadUserProfile();
          }
        }
        setLoading(false);
        return;
      }

      // If access token is expired, try to refresh
      if (TokenManager.isTokenExpired()) {
        const refreshed = await handleTokenRefresh();
        if (!refreshed) {
          setLoading(false);
          return;
        }
      }

      // Get user profile if we don't have it stored
      if (!storedUser) {
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      TokenManager.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const accessToken = TokenManager.getAccessToken();
      if (!accessToken) return;

      // Decode token to get user ID (client-safe JWT decode)
      const payload = JWTUtils.decodeToken(accessToken);
      if (!payload) {
        TokenManager.clearTokens();
        setUser(null);
        return;
      }
      const userProfile = await AuthService.getProfile(payload.userId);
      
      if (userProfile) {
        TokenManager.setUserProfile(userProfile);
        setUser(userProfile);
      } else {
        // User not found, clear tokens
        TokenManager.clearTokens();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      TokenManager.clearTokens();
      setUser(null);
    }
  };

  const handleTokenRefresh = async (): Promise<boolean> => {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        TokenManager.clearTokens();
        setUser(null);
        return false;
      }

      const newTokens = await AuthService.refreshTokens(refreshToken);
      TokenManager.setTokens(newTokens);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      TokenManager.clearTokens();
      setUser(null);
      return false;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const result = await AuthService.login(credentials);
      
      TokenManager.setTokens(result.tokens);
      TokenManager.setUserProfile(result.user);
      setUser(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      const result = await AuthService.register(data);
      
      TokenManager.setTokens(result.tokens);
      TokenManager.setUserProfile(result.user);
      setUser(result.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenManager.clearTokens();
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    await loadUserProfile();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshAuth,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access this page.</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Utility function to get auth headers for API calls
export function getAuthHeaders(): Record<string, string> {
  const token = TokenManager.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Utility function to check if user has specific role
export function useRole(requiredRole: string): boolean {
  const { user } = useAuth();
  return user?.role === requiredRole || user?.role === 'admin';
}

// Utility function to check if user has premium subscription
export function usePremium(): boolean {
  const { user } = useAuth();
  return user?.subscriptionStatus === 'premium' || user?.role === 'admin';
}

export { AuthContext };
export default AuthContext;
