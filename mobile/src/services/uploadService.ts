import apiClient from './api';
import type { InitiateUploadResponse } from '../types';

export const uploadService = {
  initiateUpload: async (
    filename: string,
    fileSize: number,
    mimeType: string,
    batchId?: string
  ): Promise<InitiateUploadResponse> => {
    const response = await apiClient.post<InitiateUploadResponse>('/api/uploads/initiate', {
      filename,
      fileSize,
      mimeType,
      ...(batchId && { batchId }),
    });
    return response.data;
  },

  uploadToS3: async (
    uploadUrl: string,
    fileData: ArrayBuffer,
    mimeType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during S3 upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mimeType);
      xhr.send(fileData);
    });
  },

  completeUpload: async (photoId: string, fileSize: number): Promise<void> => {
    await apiClient.post(`/api/uploads/complete/${photoId}`, {
      fileSizeBytes: fileSize,
    });
  },

  failUpload: async (photoId: string, reason: string): Promise<void> => {
    await apiClient.post(`/api/uploads/fail/${photoId}`, {
      reason,
    });
  },

  getBatchStatus: async (batchId: string) => {
    const response = await apiClient.get(`/api/uploads/batch/${batchId}`);
    return response.data;
  },
};

