/**
 * ============================================================================
 * useAuth Hook
 * ============================================================================
 * 
 * Custom hook to access auth context
 * 
 * Usage in components:
 *   const { user, token, login, logout } = useAuth()
 */

import { useContext } from 'react';
import { AuthContext } from '../context/auth';
import type { AuthContextType } from '../types';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

