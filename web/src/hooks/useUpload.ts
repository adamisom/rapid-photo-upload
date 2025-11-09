/**
 * ============================================================================
 * useUpload Hook
 * ============================================================================
 * 
 * Custom hook for managing file uploads with S3 integration
 * Handles: file selection, presigned URLs, S3 uploads, progress tracking
 */

import { useState, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import type { UploadFile } from '../types';

// Simple UUID v4 generator
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface UploadManager {
  files: UploadFile[];
  batchId: string | null;
  isUploading: boolean;
  totalProgress: number;
  error: string | null;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  startUpload: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;
}

export const useUpload = (maxConcurrent: number = 5): UploadManager => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);

  const addFiles = useCallback((newFiles: File[]) => {
    setError(null);
    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
    );
  }, []);

  const updateFileStatus = useCallback(
    (fileId: string, status: UploadFile['status'], error?: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status, progress: status === 'completed' || status === 'failed' ? 100 : f.progress, error }
            : f
        )
      );
    },
    []
  );

  const startUpload = useCallback(async () => {
    if (files.length === 0) {
      setError('No files selected');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create or reuse batch
      let currentBatchId = batchId;
      if (!currentBatchId) {
        currentBatchId = uuidv4();
        setBatchId(currentBatchId);
      }

      // Upload files with concurrency control
      const uploadQueue = [...files];
      const activeUploads = new Set<string>();

      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];

        // Wait for a slot if we're at max concurrent
        while (activeUploads.size >= maxConcurrent) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        activeUploads.add(file.id);

        // Upload in background without await
        (async () => {
          try {
            updateFileStatus(file.id, 'uploading');

            // Step 1: Get presigned URL
            // Only pass batchId if it already exists (after first file)
            // On first file (i === 0), let backend create the batch
            const batchIdToUse = i === 0 ? undefined : currentBatchId;
            
            const initiateResponse = await uploadService.initiateUpload(
              file.file.name,
              file.file.size,
              file.file.type || 'application/octet-stream',
              batchIdToUse
            );
            
            // After first file, update batchId with the one from backend
            if (i === 0 && initiateResponse.batchId && !currentBatchId) {
              currentBatchId = initiateResponse.batchId;
              setBatchId(currentBatchId);
            }

            // Step 2: Upload to S3
            await uploadService.uploadToS3(
              initiateResponse.uploadUrl,
              file.file,
              (progress) => updateFileProgress(file.id, progress)
            );

            // Step 3: Notify backend of completion
            await uploadService.completeUpload(initiateResponse.photoId, file.file.size);

            updateFileStatus(file.id, 'completed');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            updateFileStatus(file.id, 'failed', errorMessage);
            console.error(`Upload failed for ${file.file.name}:`, err);
          } finally {
            activeUploads.delete(file.id);
          }
        })();
      }

      // Wait for all uploads to complete
      while (activeUploads.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload batch failed';
      setError(errorMessage);
    } finally {
      setIsUploading(false);

      // Calculate total progress
      const completedCount = files.filter((f) => f.status === 'completed').length;
      setTotalProgress((completedCount / files.length) * 100);
    }
  }, [files, batchId, maxConcurrent, updateFileProgress, updateFileStatus]);

  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    setError('Upload cancelled');
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setBatchId(null);
    setIsUploading(false);
    setError(null);
    setTotalProgress(0);
  }, []);

  return {
    files,
    batchId,
    isUploading,
    totalProgress,
    error,
    addFiles,
    removeFile,
    startUpload,
    cancelUpload,
    reset,
  };
};

