/**
 * ============================================================================
 * AUTH CONTEXT
 * ============================================================================
 * 
 * React Context for global authentication state management
 * 
 * Provides:
 * - Current user info (id, email)
 * - JWT token
 * - Authentication functions (login, register, logout)
 * - Loading state
 * 
 * Usage in components:
 *   const { user, token, login, logout } = useAuth()
 */

import React, { useState, useEffect } from 'react';
import type { User, AuthContextType } from '../types';
import { authService } from '../services/authService';
import { AuthContext } from './auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUserId = authService.getUserId();
    const storedEmail = authService.getEmail();

    if (storedToken && storedUserId && storedEmail) {
      setToken(storedToken);
      setUser({ id: storedUserId, email: storedEmail });
    }

    setIsLoading(false);
  }, []);

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.register(email, password);
      authService.setAuthToken(response.token, response.userId, response.email);
      setToken(response.token);
      setUser({ id: response.userId, email: response.email });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      authService.setAuthToken(response.token, response.userId, response.email);
      setToken(response.token);
      setUser({ id: response.userId, email: response.email });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


