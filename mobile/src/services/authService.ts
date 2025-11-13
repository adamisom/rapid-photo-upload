import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types';

export const authService = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const request: RegisterRequest = { email, password };
      const response = await apiClient.post<AuthResponse>('/api/auth/register', request);
      const { token } = response.data;
      await SecureStore.setItemAsync('authToken', token);
      return response.data;
    } catch (error: any) {
      // Extract backend error message if available
      const backendMessage = error.response?.data?.message || error.message || 'Registration failed';
      // Create a simple error object that won't trigger React Native error overlay
      const registerError: any = new Error(backendMessage);
      registerError.isHandled = true; // Mark as handled to prevent error overlay
      throw registerError;
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const request: LoginRequest = { email, password };
      const response = await apiClient.post<AuthResponse>('/api/auth/login', request);
      const { token } = response.data;
      await SecureStore.setItemAsync('authToken', token);
      return response.data;
    } catch (error: any) {
      // Extract backend error message if available
      const backendMessage = error.response?.data?.message || error.message || 'Login failed';
      // Create a simple error object that won't trigger React Native error overlay
      const loginError: any = new Error(backendMessage);
      loginError.isHandled = true; // Mark as handled to prevent error overlay
      loginError.response = error.response; // Preserve response for error extraction
      throw loginError;
    }
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

