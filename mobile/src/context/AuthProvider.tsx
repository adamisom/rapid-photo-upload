import React, { useState, useEffect, ReactNode } from 'react';
import { AuthContext, type AuthContextType } from './authContext';
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔐 Attempting login for:', email);
      const response = await authService.login(email, password);
      console.log('✅ Login successful:', email);
      setToken(response.token);
      // Decode JWT to get user info
      const payload = response.token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      setUser({
        id: decoded.userId || decoded.sub,
        email: decoded.email || decoded.username || email,
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

