import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext, type AuthContextType, type AuthResult } from './authContext';
import { authService } from '../services/authService';
import type { User } from '../types';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from secure storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await authService.getToken();
        if (storedToken) {
          setToken(storedToken);
          // Decode JWT to get user info
          const payload = storedToken.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          setUser({
            id: decoded.userId || decoded.sub,
            email: decoded.email || decoded.username,
          });
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    // Don't set isLoading here - it causes LoginPage to re-render and remount LoginScreen
    // isLoading should only be used for initial auth check
    try {
      const response = await authService.login(email, password);
      setToken(response.token);
      // Decode JWT to get user info
      const payload = response.token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      setUser({
        id: decoded.userId || decoded.sub,
        email: decoded.email || decoded.username || email,
      });
      return { success: true };
    } catch (error: any) {
      // Extract error message
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      // Return error result instead of throwing - this prevents remounts
      return { success: false, error: message };
    }
  };

  const register = async (email: string, password: string): Promise<AuthResult> => {
    // Don't set isLoading here - it causes RegisterPage to re-render and remount RegisterScreen
    // isLoading should only be used for initial auth check
    try {
      const response = await authService.register(email, password);
      setToken(response.token);
      // Decode JWT to get user info
      const payload = response.token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      setUser({
        id: decoded.userId || decoded.sub,
        email: decoded.email || decoded.username || email,
      });
      return { success: true };
    } catch (error: any) {
      // Extract error message
      const message = error?.response?.data?.message || error?.message || 'Registration failed';
      // Return error result instead of throwing - this prevents remounts
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

