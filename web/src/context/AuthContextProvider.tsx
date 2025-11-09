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

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUserId = authService.getUserId();
    const storedEmail = authService.getEmail();

    if (storedToken && storedUserId && storedEmail) {
      setToken(storedToken);
      setUser({ id: storedUserId, email: storedEmail });
    }
  }, []);

  const logout = () => {
    authService.clearAuthToken();
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


