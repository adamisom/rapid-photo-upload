/**
 * Photo Service - Gallery API calls
 */

import apiClient from './api';
import type { PhotoListResponse, PhotoDto } from '../types';

export const photoService = {
  /**
   * Get user's photos with pagination
   */
  getPhotos: async (page: number = 0, pageSize: number = 15): Promise<PhotoListResponse> => {
    const response = await apiClient.get<PhotoListResponse>('/api/photos', {
      params: { page, pageSize },
    });
    return response.data;
  },

  /**
   * Get single photo details
   */
  getPhoto: async (photoId: string): Promise<PhotoDto> => {
    const response = await apiClient.get<PhotoDto>(`/api/photos/${photoId}`);
    return response.data;
  },

  /**
   * Update photo tags (max 3, 50 chars each)
   */
  updateTags: async (photoId: string, tags: string[]): Promise<void> => {
    await apiClient.put(`/api/photos/${photoId}/tags`, { tags });
  },

  /**
   * Delete a photo
   */
  deletePhoto: async (photoId: string): Promise<void> => {
    await apiClient.delete(`/api/photos/${photoId}`);
  },
};

