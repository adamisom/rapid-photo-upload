/**
 * ============================================================================
 * UPLOAD SERVICE
 * ============================================================================
 * 
 * Upload-related API calls and S3 integration
 * 
 * Endpoints:
 * - POST /api/upload/initiate        - Get presigned URL
 * - POST /api/upload/complete/{id}   - Mark upload complete
 * - POST /api/upload/failed/{id}     - Mark upload failed
 * - GET  /api/upload/batch/{id}/status - Poll batch progress
 */

import apiClient from './api';
import type {
  InitiateUploadResponse,
  UploadCompleteRequest,
  BatchStatusResponse,
  BatchCompleteRequest,
  BatchCompleteResponse,
} from '../types';

export const uploadService = {
  /**
   * Initiate upload: Get presigned URL for S3
   * @param filename Original filename
   * @param fileSizeBytes File size in bytes
   * @param contentType MIME type (e.g., "image/jpeg")
   * @param batchId Optional batch ID (creates new batch if not provided)
   * @returns Presigned upload URL and photo ID
   */
  initiateUpload: async (
    filename: string,
    fileSizeBytes: number,
    contentType: string,
    batchId?: string
  ): Promise<InitiateUploadResponse> => {
    const response = await apiClient.post<InitiateUploadResponse>('/api/upload/initiate', {
      filename,
      fileSizeBytes,
      contentType,
      ...(batchId && { batchId }),
    });
    return response.data;
  },

  /**
   * Complete upload: Notify backend that S3 upload is done
   * @param photoId Photo ID from initiate response
   * @param fileSizeBytes Actual file size uploaded to S3
   * @param eTag Optional ETag from S3 response
   */
  completeUpload: async (
    photoId: string,
    fileSizeBytes: number,
    eTag?: string
  ): Promise<void> => {
    const request: UploadCompleteRequest = {
      fileSizeBytes,
      ...(eTag && { eTag }),
    };
    await apiClient.post(`/api/upload/complete/${photoId}`, request);
  },

  /**
   * Mark upload failed: Notify backend of failure
   * @param photoId Photo ID from initiate response
   * @param errorMessage Error description
   */
  failUpload: async (photoId: string, errorMessage: string): Promise<void> => {
    await apiClient.post(`/api/upload/failed/${photoId}`, {
      errorMessage,
    });
  },

  /**
   * Batch complete uploads: Notify backend of multiple upload completions
   * More efficient than calling completeUpload multiple times
   * @param items Array of {photoId, fileSizeBytes, eTag?} items
   */
  batchComplete: async (items: Array<{photoId: string; fileSizeBytes: number; eTag?: string}>): Promise<BatchCompleteResponse> => {
    const request: BatchCompleteRequest = { items };
    const response = await apiClient.post<BatchCompleteResponse>('/api/upload/complete/batch', request);
    return response.data;
  },

  /**
   * Poll batch status: Get progress of all photos in batch
   * @param batchId Batch ID from initiate response
   * @returns Batch progress with all photos and their statuses
   */
  getBatchStatus: async (batchId: string): Promise<BatchStatusResponse> => {
    const response = await apiClient.get<BatchStatusResponse>(
      `/api/upload/batch/${batchId}/status`
    );
    return response.data;
  },

  /**
   * Upload file directly to S3 presigned URL
   * @param presignedUrl URL from initiateUpload
   * @param file File to upload
   * @param onProgress Callback for upload progress (0-100)
   */
  uploadToS3: async (
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during S3 upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  },
};

