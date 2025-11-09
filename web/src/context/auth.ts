/**
 * ============================================================================
 * Auth Context (Separate from Provider)
 * ============================================================================
 * 
 * React Context for auth state - separated from provider for ESLint compliance
 */

import { createContext } from 'react';
import type { AuthContextType } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

