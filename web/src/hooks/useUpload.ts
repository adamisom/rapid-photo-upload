/**
 * ============================================================================
 * useUpload Hook
 * ============================================================================
 * 
 * Custom hook for managing file uploads with S3 integration
 * Handles: file selection, presigned URLs, S3 uploads, progress tracking
 */

import { useState, useCallback, useEffect } from 'react';
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

interface UploadState {
  activeFiles: UploadFile[];
  completedBatches: UploadBatch[];
}

interface UploadManager {
  files: UploadFile[];
  currentBatchId: string | null;
  completedBatches: UploadBatch[];
  isUploading: boolean;
  totalProgress: number;
  estimatedTimeRemaining: number | null; // seconds
  error: string | null;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  removeAll: () => void;
  retryFile: (fileId: string) => void;
  clearLastBatch: () => void;
  clearPreviousBatches: () => void;
  startUpload: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;
}

export const useUpload = (maxConcurrent: number = 5): UploadManager => {
  // Combined state for atomic updates
  const [uploadState, setUploadState] = useState<UploadState>({
    activeFiles: [],
    completedBatches: []
  });
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  // Recalculate progress during upload whenever files change status
  useEffect(() => {
    if (!isUploading) return;
    
    const uploadingFiles = uploadState.activeFiles.filter((f) => 
      f.status === 'uploading' || f.status === 'completed' || f.status === 'pending'
    );
    
    if (uploadingFiles.length === 0) return;
    
    // Calculate progress by bytes, not by file count
    const totalBytes = uploadingFiles.reduce((sum, f) => sum + f.file.size, 0);
    const completedBytes = uploadingFiles
      .filter((f) => f.status === 'completed')
      .reduce((sum, f) => sum + f.file.size, 0);
    const progress = totalBytes > 0 ? (completedBytes / totalBytes) * 100 : 0;
    setTotalProgress(progress);
    
    // Calculate ETA
    const completedCount = uploadingFiles.filter((f) => f.status === 'completed').length;
    if (uploadStartTime && completedCount > 0) {
      const elapsedSeconds = (Date.now() - uploadStartTime) / 1000;
      const averageTimePerFile = elapsedSeconds / completedCount;
      const remainingFiles = uploadingFiles.length - completedCount;
      const estimatedSeconds = Math.ceil(averageTimePerFile * remainingFiles);
      setEstimatedTimeRemaining(estimatedSeconds);
    }
  }, [uploadState.activeFiles, isUploading, uploadStartTime]);

  const addFiles = useCallback((newFiles: File[]) => {
    setError(null);
    const uploadFiles: UploadFile[] = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    }));
    setUploadState((prev) => ({
      ...prev,
      activeFiles: [...prev.activeFiles, ...uploadFiles]
    }));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadState((prev) => ({
      ...prev,
      activeFiles: prev.activeFiles.filter((f) => f.id !== fileId)
    }));
  }, []);

  const removeAll = useCallback(() => {
    setUploadState((prev) => ({
      ...prev,
      activeFiles: []
    }));
  }, []);

  const retryFile = useCallback((fileId: string) => {
    setUploadState((prev) => ({
      ...prev,
      activeFiles: prev.activeFiles.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending', progress: 0, error: undefined }
          : f
      )
    }));
  }, []);

  const clearLastBatch = useCallback(() => {
    setUploadState((prev) => ({
      ...prev,
      completedBatches: prev.completedBatches.slice(1)
    }));
  }, []);

  const clearPreviousBatches = useCallback(() => {
    setUploadState((prev) => ({
      ...prev,
      completedBatches: prev.completedBatches.slice(0, 1)
    }));
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setUploadState((prev) => ({
      ...prev,
      activeFiles: prev.activeFiles.map((f) => 
        f.id === fileId ? { ...f, progress } : f
      )
    }));
  }, []);

  const updateFileStatus = useCallback(
    (fileId: string, status: UploadFile['status'], error?: string) => {
      setUploadState((prev) => ({
        ...prev,
        activeFiles: prev.activeFiles.map((f) =>
          f.id === fileId
            ? { ...f, status, progress: status === 'completed' || status === 'failed' ? 100 : f.progress, error }
            : f
        )
      }));
    },
    []
  );

  const startUpload = useCallback(async () => {
    // Only upload pending files
    const pendingFiles = uploadState.activeFiles.filter((f) => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setError('No files to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadStartTime(Date.now()); // Track start time for ETA calculation

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

      // ATOMIC STATE UPDATE: Move batch to history ONLY if ALL files succeeded
      // Keep any failed files in active area so they can be retried
      setUploadState((current) => {
        // Extract completed files from THIS batch
        const completedFilesFromBatch = current.activeFiles.filter((f) => 
          f.status === 'completed' && 
          pendingFiles.some((pf) => pf.id === f.id)
        );
        
        // Check if ALL files in the batch succeeded
        const allFilesSucceeded = completedFilesFromBatch.length === pendingFiles.length;
        
        // Calculate total progress BEFORE moving files (size-based, not count-based)
        // This ensures we calculate based on final state
        const currentBatchFiles = current.activeFiles.filter((f) =>
          pendingFiles.some((pf) => pf.id === f.id)
        );
        
        // Calculate progress by bytes, not by file count (more accurate for mixed file sizes)
        const totalBytes = pendingFiles.reduce((sum, f) => sum + f.file.size, 0);
        const completedBytes = currentBatchFiles
          .filter((f) => f.status === 'completed')
          .reduce((sum, f) => sum + f.file.size, 0);
        const progress = totalBytes > 0 ? (completedBytes / totalBytes) * 100 : 0;
        setTotalProgress(progress);
        
        const completedCount = currentBatchFiles.filter((f) => f.status === 'completed').length;
        
        // Calculate ETA based on elapsed time and progress
        if (uploadStartTime && completedCount > 0) {
          const elapsedSeconds = (Date.now() - uploadStartTime) / 1000;
          const averageTimePerFile = elapsedSeconds / completedCount;
          const remainingFiles = pendingFiles.length - completedCount;
          const estimatedSeconds = Math.ceil(averageTimePerFile * remainingFiles);
          setEstimatedTimeRemaining(estimatedSeconds);
        }
        
        // Only create batch if ALL files succeeded
        const newBatch = allFilesSucceeded && completedFilesFromBatch.length > 0 ? {
          id: newBatchId,
          files: completedFilesFromBatch,
          completedAt: new Date()
        } : null;
        
        // Build new completedBatches array with idempotency check (for React StrictMode)
        const newBatches = newBatch 
          ? (current.completedBatches.some(b => b.id === newBatch.id)
              ? current.completedBatches // Already exists - skip
              : [newBatch, ...current.completedBatches]) // Add to front
          : current.completedBatches;
        
        // Return new state with both updates atomically
        // If all succeeded: remove completed files from active area
        // If any failed: keep ALL files (both completed and failed) in active area for review
        return {
          activeFiles: allFilesSucceeded 
            ? current.activeFiles.filter(f => 
                f.status === 'pending' || f.status === 'uploading'
              )
            : current.activeFiles.filter(f => 
                f.status === 'pending' || f.status === 'uploading' || f.status === 'failed' || 
                (f.status === 'completed' && pendingFiles.some(pf => pf.id === f.id))
              ),
          completedBatches: newBatches
        };
      });
    }
  }, [uploadState, maxConcurrent, updateFileProgress, updateFileStatus, uploadStartTime]);

  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    setError('Upload cancelled');
  }, []);

  const reset = useCallback(() => {
    setUploadState({
      activeFiles: [],
      completedBatches: []
    });
    setCurrentBatchId(null);
    setIsUploading(false);
    setError(null);
    setTotalProgress(0);
    setEstimatedTimeRemaining(null);
    setUploadStartTime(null);
  }, []);

  return {
    files: uploadState.activeFiles,
    currentBatchId,
    completedBatches: uploadState.completedBatches,
    isUploading,
    totalProgress,
    estimatedTimeRemaining,
    error,
    addFiles,
    removeFile,
    removeAll,
    retryFile,
    clearLastBatch,
    clearPreviousBatches,
    startUpload,
    cancelUpload,
    reset,
  };
};

