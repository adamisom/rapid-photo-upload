import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types';

export const authService = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const request: RegisterRequest = { email, password };
    const response = await apiClient.post<AuthResponse>('/api/auth/register', request);
    const { token } = response.data;
    await SecureStore.setItemAsync('authToken', token);
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const request: LoginRequest = { email, password };
    const response = await apiClient.post<AuthResponse>('/api/auth/login', request);
    const { token } = response.data;
    await SecureStore.setItemAsync('authToken', token);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync('authToken');
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync('authToken');
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await authService.getToken();
    return !!token;
  },
};

