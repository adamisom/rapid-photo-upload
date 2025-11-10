import apiClient from './api';
import type { PhotoListResponse } from '../types';

export const photoService = {
  getPhotos: async (page: number = 0, pageSize: number = 20): Promise<PhotoListResponse> => {
    const response = await apiClient.get<PhotoListResponse>('/api/photos', {
      params: { page, pageSize },
    });
    return response.data;
  },

  deletePhoto: async (photoId: string): Promise<void> => {
    await apiClient.delete(`/api/photos/${photoId}`);
  },

  updateTags: async (photoId: string, tags: string[]): Promise<void> => {
    await apiClient.put(`/api/photos/${photoId}/tags`, { tags });
  },
};

