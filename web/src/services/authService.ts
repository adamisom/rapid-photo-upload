/**
 * ============================================================================
 * AUTH SERVICE
 * ============================================================================
 * 
 * Authentication-related API calls
 * 
 * Endpoints:
 * - POST /api/auth/register
 * - POST /api/auth/login
 */

import apiClient from './api';
import type { AuthResponse, RegisterRequest, LoginRequest } from '../types';

export const authService = {
  /**
   * Register a new user
   * @param email User email
   * @param password User password (minimum 8 chars)
   * @returns JWT token, user ID, and email
   */
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', {
      email,
      password,
    } as RegisterRequest);
    return response.data;
  },

  /**
   * Login existing user
   * @param email User email
   * @param password User password
   * @returns JWT token, user ID, and email
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    } as LoginRequest);
    return response.data;
  },

  /**
   * Store auth token in localStorage
   */
  setAuthToken: (token: string, userId: string, email: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('email', email);
  },

  /**
   * Clear auth token from localStorage
   */
  clearAuthToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  /**
   * Get stored auth token
   */
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  /**
   * Get stored user ID
   */
  getUserId: (): string | null => {
    return localStorage.getItem('userId');
  },

  /**
   * Get stored email
   */
  getEmail: (): string | null => {
    return localStorage.getItem('email');
  },
};

