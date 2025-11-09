/**
 * ============================================================================
 * UPLOAD SERVICE (Phase 4.2)
 * ============================================================================
 * 
 * Upload-related API calls
 * 
 * Endpoints:
 * - POST /api/upload/initiate        - Get presigned URL
 * - POST /api/upload/complete/{id}   - Mark upload complete
 * - POST /api/upload/failed/{id}     - Mark upload failed
 * - GET  /api/upload/batch/{id}/status - Poll batch progress
 * 
 * To be implemented in Phase 4.2
 */

import type {
  InitiateUploadResponse,
  BatchStatusResponse,
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
    // Phase 4.2 implementation
    console.debug('uploadService.initiateUpload', { filename, fileSizeBytes, contentType, batchId });
    throw new Error('uploadService.initiateUpload not yet implemented');
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
    // Phase 4.2 implementation
    console.debug('uploadService.completeUpload', { photoId, fileSizeBytes, eTag });
    throw new Error('uploadService.completeUpload not yet implemented');
  },

  /**
   * Mark upload failed: Notify backend of failure
   * @param photoId Photo ID from initiate response
   * @param errorMessage Error description
   */
  failUpload: async (photoId: string, errorMessage: string): Promise<void> => {
    // Phase 4.2 implementation
    console.debug('uploadService.failUpload', { photoId, errorMessage });
    throw new Error('uploadService.failUpload not yet implemented');
  },

  /**
   * Poll batch status: Get progress of all photos in batch
   * @param batchId Batch ID from initiate response
   * @returns Batch progress with all photos and their statuses
   */
  getBatchStatus: async (batchId: string): Promise<BatchStatusResponse> => {
    // Phase 4.2 implementation
    console.debug('uploadService.getBatchStatus', { batchId });
    throw new Error('uploadService.getBatchStatus not yet implemented');
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
    // Phase 4.2 implementation
    console.debug('uploadService.uploadToS3', { presignedUrl, file, onProgress });
    throw new Error('uploadService.uploadToS3 not yet implemented');
  },
};

