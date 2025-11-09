/**
 * ============================================================================
 * useUpload Hook
 * ============================================================================
 * 
 * Custom hook for managing file uploads with S3 integration
 * Handles: file selection, presigned URLs, S3 uploads, progress tracking
 */

import { useState, useCallback, useRef } from 'react';
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

export interface UploadBatch {
  id: string;
  files: UploadFile[];
  completedAt: Date;
}

interface UploadManager {
  files: UploadFile[];
  currentBatchId: string | null;
  completedBatches: UploadBatch[];
  isUploading: boolean;
  totalProgress: number;
  error: string | null;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  clearLastBatch: () => void;
  clearPreviousBatches: () => void;
  startUpload: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;
}

export const useUpload = (maxConcurrent: number = 5): UploadManager => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [completedBatches, setCompletedBatches] = useState<UploadBatch[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);

  // Use ref to pass data from setFiles callback to setCompletedBatches
  const batchToAddRef = useRef<{ id: string; files: UploadFile[] } | null>(null);

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

  const clearLastBatch = useCallback(() => {
    setCompletedBatches((prev) => prev.slice(1));
  }, []);

  const clearPreviousBatches = useCallback(() => {
    setCompletedBatches((prev) => prev.slice(0, 1));
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
    // Only upload pending files
    const pendingFiles = files.filter((f) => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setError('No files to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    // Generate new batchId when "Start Upload" is clicked
    const newBatchId = uuidv4();
    setCurrentBatchId(newBatchId);

    try {
      // Upload files with concurrency control
      const uploadQueue = [...pendingFiles];
      const activeUploads = new Set<string>();

      for (const file of uploadQueue) {
        // Wait for a slot if we're at max concurrent
        while (activeUploads.size >= maxConcurrent) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        activeUploads.add(file.id);

        // Upload in background without await
        (async () => {
          try {
            updateFileStatus(file.id, 'uploading');

            // Step 1: Get presigned URL (with client-generated batchId)
            const initiateResponse = await uploadService.initiateUpload(
              file.file.name,
              file.file.size,
              file.file.type || 'application/octet-stream',
              newBatchId // Pass the new batchId to all files
            );

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

      // Step 1: Update files and store batch info in ref
      setFiles((currentFiles) => {
        const completedFilesFromBatch = currentFiles.filter((f) => 
          (f.status === 'completed' || f.status === 'failed') && 
          pendingFiles.some((pf) => pf.id === f.id)
        );
        
        // Store in ref to use in next state update (NO NESTING!)
        if (completedFilesFromBatch.length > 0) {
          batchToAddRef.current = {
            id: newBatchId,
            files: completedFilesFromBatch
          };
        }
        
        // Return filtered files (remove completed ones)
        return currentFiles.filter((f) => f.status === 'pending' || f.status === 'uploading');
      });
      
      // Step 2: Update completed batches using ref data (SEPARATE!)
      if (batchToAddRef.current) {
        const batchData = batchToAddRef.current;
        setCompletedBatches((prev) => {
          // Check if batch already exists (idempotency for React StrictMode)
          if (prev.some(b => b.id === batchData.id)) {
            return prev;
          }
          // Add new batch to front of array
          return [{
            id: batchData.id,
            files: batchData.files,
            completedAt: new Date()
          }, ...prev];
        });
        batchToAddRef.current = null; // Clear ref
      }

      // Calculate total progress for pending files only
      const completedCount = pendingFiles.filter((f) => f.status === 'completed').length;
      setTotalProgress((completedCount / pendingFiles.length) * 100);
    }
  }, [files, maxConcurrent, updateFileProgress, updateFileStatus]);

  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    setError('Upload cancelled');
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setCurrentBatchId(null);
    setCompletedBatches([]);
    setIsUploading(false);
    setError(null);
    setTotalProgress(0);
  }, []);

  return {
    files,
    currentBatchId,
    completedBatches,
    isUploading,
    totalProgress,
    error,
    addFiles,
    removeFile,
    clearLastBatch,
    clearPreviousBatches,
    startUpload,
    cancelUpload,
    reset,
  };
};

