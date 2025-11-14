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
  totalUploadTimeSeconds?: number; // Time taken to upload entire batch (rounded to nearest 0.01s)
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
  isPreparing: boolean; // True while requesting presigned URLs (before first upload starts)
  totalProgress: number;
  estimatedTimeRemaining: number | null; // seconds
  error: string | null;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileId: string) => void;
  removeAll: () => void;
  retryFile: (fileId: string) => void;
  retryAllFailed: () => void;
  clearLastBatch: () => void;
  clearPreviousBatches: () => void;
  startUpload: () => Promise<void>;
  cancelUpload: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'rapidphoto_upload_state';

// Helper to serialize upload state (File objects can't be serialized, so we store metadata)
interface SerializableUploadFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: UploadFile['status'];
  progress: number;
  error?: string;
}

interface SerializableUploadState {
  activeFiles: SerializableUploadFile[];
  completedBatches: Array<{
    id: string;
    files: SerializableUploadFile[];
    completedAt: string;
    totalUploadTimeSeconds?: number;
  }>;
  currentBatchId: string | null;
  isUploading: boolean;
  totalProgress: number;
  estimatedTimeRemaining: number | null;
  uploadStartTime: number | null;
}

const saveStateToStorage = (state: UploadState, currentBatchId: string | null, isUploading: boolean, totalProgress: number, estimatedTimeRemaining: number | null, uploadStartTime: number | null) => {
  try {
    const serializable: SerializableUploadState = {
      activeFiles: state.activeFiles.map(f => ({
        id: f.id,
        fileName: f.file.name,
        fileSize: f.file.size,
        fileType: f.file.type,
        status: f.status,
        progress: f.progress,
        error: f.error
      })),
      completedBatches: state.completedBatches.map(b => ({
        id: b.id,
        files: b.files.map(f => ({
          id: f.id,
          fileName: f.file.name,
          fileSize: f.file.size,
          fileType: f.file.type,
          status: f.status,
          progress: f.progress,
          error: f.error
        })),
        completedAt: b.completedAt.toISOString(),
        totalUploadTimeSeconds: b.totalUploadTimeSeconds
      })),
      currentBatchId,
      isUploading,
      totalProgress,
      estimatedTimeRemaining,
      uploadStartTime
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.warn('Failed to save upload state to localStorage:', err);
  }
};

const loadStateFromStorage = (): Partial<SerializableUploadState> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as SerializableUploadState;
  } catch (err) {
    console.warn('Failed to load upload state from localStorage:', err);
    return null;
  }
};

export const useUpload = (maxConcurrent: number = 20): UploadManager => {
  // Initialize state from localStorage if available
  const [uploadState, setUploadState] = useState<UploadState>(() => {
    const stored = loadStateFromStorage();
    if (stored && stored.activeFiles) {
      // Restore state - note: File objects can't be restored, so we create placeholder File objects
      // These won't be usable for re-upload, but we can show their status
      const activeFiles: UploadFile[] = stored.activeFiles.map(sf => {
        // Create a minimal File-like object for display purposes
        // Note: This won't work for actual file operations, but allows state display
        const blob = new Blob([], { type: sf.fileType });
        const file = new File([blob], sf.fileName, { type: sf.fileType });
        Object.defineProperty(file, 'size', { value: sf.fileSize, writable: false });
        
        return {
          id: sf.id,
          file,
          status: sf.status,
          progress: sf.progress,
          error: sf.error
        };
      });
      
      const completedBatches: UploadBatch[] = (stored.completedBatches || []).map(b => ({
        id: b.id,
        files: b.files.map(sf => {
          const blob = new Blob([], { type: sf.fileType });
          const file = new File([blob], sf.fileName, { type: sf.fileType });
          Object.defineProperty(file, 'size', { value: sf.fileSize, writable: false });
          return {
            id: sf.id,
            file,
            status: sf.status,
            progress: sf.progress,
            error: sf.error
          };
        }),
        completedAt: new Date(b.completedAt),
        totalUploadTimeSeconds: b.totalUploadTimeSeconds
      }));
      
      return { activeFiles, completedBatches };
    }
    return {
      activeFiles: [],
      completedBatches: []
    };
  });
  
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(() => {
    const stored = loadStateFromStorage();
    return stored?.currentBatchId || null;
  });
  const [isUploading, setIsUploading] = useState(() => {
    const stored = loadStateFromStorage();
    return stored?.isUploading || false;
  });
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(() => {
    const stored = loadStateFromStorage();
    return stored?.totalProgress || 0;
  });
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(() => {
    const stored = loadStateFromStorage();
    return stored?.estimatedTimeRemaining || null;
  });
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(() => {
    const stored = loadStateFromStorage();
    return stored?.uploadStartTime || null;
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveStateToStorage(uploadState, currentBatchId, isUploading, totalProgress, estimatedTimeRemaining, uploadStartTime);
  }, [uploadState, currentBatchId, isUploading, totalProgress, estimatedTimeRemaining, uploadStartTime]);

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

  const retryAllFailed = useCallback(() => {
    setUploadState((prev) => ({
      ...prev,
      activeFiles: prev.activeFiles.map((f) =>
        f.status === 'failed'
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
    setIsPreparing(true); // Show "Preparing..." while requesting URLs
    setError(null);
    // Reset uploadStartTime to clear any stale value from localStorage
    setUploadStartTime(null);
    // Will be set when first S3 upload actually starts

    // Generate new batchId when "Start Upload" is clicked
    const newBatchId = uuidv4();
    setCurrentBatchId(newBatchId);

    // Track actual upload start time (declared outside try so it's accessible in finally)
    let actualUploadStartTime: number | null = null;

    try {
      // ========================================================================
      // PIPELINED APPROACH: Fetch URLs in batches, start uploading immediately
      // ========================================================================
      // Fetch URLs in batches (e.g., 100), start uploading as soon as each batch is ready
      // This allows uploads to start while still fetching remaining URLs
      const URL_BATCH_SIZE = 100; // Request 100 URLs at a time
      const presignedUrlMap = new Map<string, { photoId: string; uploadUrl: string; batchId: string }>();
      const readyToUploadQueue: UploadFile[] = [];
      let urlFetchingComplete = false;
      let urlFetchError: Error | null = null;
      
      // Split files into batches for URL requests
      const urlBatches: UploadFile[][] = [];
      for (let i = 0; i < pendingFiles.length; i += URL_BATCH_SIZE) {
        urlBatches.push(pendingFiles.slice(i, i + URL_BATCH_SIZE));
      }
      
      // URL fetching function (runs in parallel with uploads)
      const fetchUrlsForBatch = async (batch: UploadFile[], batchIndex: number) => {
        try {
          const urlResponses = await Promise.all(
            batch.map(file =>
              uploadService.initiateUpload(
                file.file.name,
                file.file.size,
                file.file.type || 'application/octet-stream',
                newBatchId
              ).then(response => ({ fileId: file.id, response }))
            )
          );
          
          // Store URLs and add to ready queue
          urlResponses.forEach(({ fileId, response }) => {
            presignedUrlMap.set(fileId, {
              photoId: response.photoId,
              uploadUrl: response.uploadUrl,
              batchId: response.batchId
            });
            
            // Update file with photoId
            setUploadState(prev => ({
              ...prev,
              activeFiles: prev.activeFiles.map(f =>
                f.id === fileId ? { ...f, photoId: response.photoId } : f
              )
            }));
            
            // Add to ready queue
            const file = pendingFiles.find(f => f.id === fileId);
            if (file) {
              readyToUploadQueue.push(file);
            }
          });
        } catch (err) {
          console.error(`Failed to get presigned URLs for batch ${batchIndex}:`, err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to get upload URL';
          batch.forEach(file => {
            updateFileStatus(file.id, 'failed', errorMessage);
          });
          if (!urlFetchError) {
            urlFetchError = err instanceof Error ? err : new Error(String(err));
          }
        }
      };
      
      // Start fetching URLs with limited concurrency (1 batch at a time)
      // Limited to 1 batch to stay under database connection limit (100 max_connections)
      // Each URL request needs a DB connection, so 100 URLs = 100 connections max
      const MAX_CONCURRENT_URL_BATCHES = 1; // Fetch 1 batch (100 URLs) at a time
      const urlFetchPromises: Promise<void>[] = [];
      let nextBatchIndex = 0;
      let activeBatchCount = 0;
      
      // Function to start fetching next batch with concurrency limit
      const startNextBatch = () => {
        if (nextBatchIndex >= urlBatches.length || activeBatchCount >= MAX_CONCURRENT_URL_BATCHES) {
          return;
        }
        
        const batchIndex = nextBatchIndex++;
        activeBatchCount++;
        
        const promise = fetchUrlsForBatch(urlBatches[batchIndex], batchIndex);
        urlFetchPromises.push(promise);
        
        // When this batch completes, start the next one
        promise.finally(() => {
          activeBatchCount--;
          startNextBatch(); // Try to start next batch
        });
      };
      
      // Start initial batches (up to concurrency limit)
      for (let i = 0; i < Math.min(MAX_CONCURRENT_URL_BATCHES, urlBatches.length); i++) {
        startNextBatch();
      }
      
      // Mark URL fetching as complete when all batches are done
      Promise.all(urlFetchPromises).then(() => {
        urlFetchingComplete = true;
        setIsPreparing(false); // Hide "Preparing..." once all URLs are fetched
      }).catch(() => {
        urlFetchingComplete = true;
        setIsPreparing(false);
      });
      
      // Wait for first batch to be ready before starting uploads (so we have something to upload)
      if (urlBatches.length > 0 && urlFetchPromises.length > 0) {
        await urlFetchPromises[0]; // Wait for first batch specifically
        setIsPreparing(false); // Hide "Preparing..." once first batch is ready
      }
      
      // Check if we have any files ready to upload
      if (readyToUploadQueue.length === 0 && urlFetchingComplete) {
        if (urlFetchError) {
          setError('Failed to get presigned URLs for any files');
        } else {
          setError('No files ready to upload');
        }
        setIsUploading(false);
        setIsPreparing(false);
        return;
      }

      // ========================================================================
      // PHASE 2: Upload files to S3 with concurrency control (pipelined)
      // ========================================================================
      // Upload files as they become available in the ready queue
      const activeUploads = new Set<string>();
      
      // Queue for batched complete notifications
      const completedQueue: Array<{ photoId: string; fileSize: number }> = [];
      const BATCH_COMPLETE_SIZE = 5; // Send batch every 5 completions
      const BATCH_COMPLETE_INTERVAL = 1000; // Or every 1 second
      let batchCompleteTimer: ReturnType<typeof setInterval> | null = null;
      let lastBatchCompleteTime = Date.now();
      
      // Flush completed queue to backend
      const flushCompletedQueue = async () => {
        if (completedQueue.length === 0) return;
        
        const batch = completedQueue.splice(0, BATCH_COMPLETE_SIZE);
        lastBatchCompleteTime = Date.now();
        
        try {
          await uploadService.batchComplete(
            batch.map(item => ({
              photoId: item.photoId,
              fileSizeBytes: item.fileSize
            }))
          );
          
          // Mark files as completed in UI (batch complete confirms they're done)
          // Note: Files are already marked as completed optimistically after S3 upload
          // This just confirms the backend knows about them
        } catch (err) {
          console.error('Batch complete failed, will retry:', err);
          // Put items back in queue for retry
          completedQueue.unshift(...batch);
        }
      };
      
      // Set up periodic flush
      batchCompleteTimer = setInterval(() => {
        if (completedQueue.length > 0 && Date.now() - lastBatchCompleteTime >= BATCH_COMPLETE_INTERVAL) {
          flushCompletedQueue();
        }
      }, BATCH_COMPLETE_INTERVAL);

      // Event-driven slot waiting (more efficient than polling)
      const waitForSlot = (): Promise<void> => {
        return new Promise((resolve) => {
          const checkSlot = () => {
            if (activeUploads.size < maxConcurrent) {
              resolve();
            } else {
              setTimeout(checkSlot, 10); // Check every 10ms instead of 100ms
            }
          };
          checkSlot();
        });
      };
      
      // Helper to wait for a file to be ready in the queue
      const waitForFileInQueue = (): Promise<UploadFile | null> => {
        return new Promise((resolve) => {
          const checkQueue = () => {
            if (readyToUploadQueue.length > 0) {
              const file = readyToUploadQueue.shift()!;
              resolve(file);
            } else if (urlFetchingComplete) {
              // No more files coming, we're done
              resolve(null);
            } else {
              // Still fetching URLs, wait a bit and check again
              setTimeout(checkQueue, 50);
            }
          };
          checkQueue();
        });
      };

      // Process files as they become available (pipelined)
      while (true) {
        // Wait for a file to be ready or for fetching to complete
        const file = await waitForFileInQueue();
        if (!file) {
          // No more files, but wait for active uploads to finish
          break;
        }
        
        // Wait for a slot (event-driven, not polling)
        await waitForSlot();

        activeUploads.add(file.id);
        const urlData = presignedUrlMap.get(file.id);
        
        if (!urlData) {
          // URL not found (shouldn't happen, but handle gracefully)
          updateFileStatus(file.id, 'failed', 'Presigned URL not found');
          activeUploads.delete(file.id);
          continue;
        }

        // Upload in background without await
        (async () => {
          try {
            // Start timer when first upload actually begins (not when requesting URLs)
            if (actualUploadStartTime === null) {
              actualUploadStartTime = Date.now();
              setUploadStartTime(actualUploadStartTime);
              setIsPreparing(false); // First upload started, hide "Preparing..."
            }
            
            updateFileStatus(file.id, 'uploading');

            // Upload to S3 (URL already obtained in Phase 1)
            await uploadService.uploadToS3(
              urlData.uploadUrl,
              file.file,
              (progress) => updateFileProgress(file.id, progress)
            );

            // Queue for batched complete notification
            completedQueue.push({
              photoId: urlData.photoId,
              fileSize: file.file.size
            });
            
            // Mark as completed optimistically (S3 upload succeeded)
            updateFileStatus(file.id, 'completed');
            
            // Flush if batch size reached
            if (completedQueue.length >= BATCH_COMPLETE_SIZE) {
              await flushCompletedQueue();
            }
            
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
      
      // Final flush of any remaining completions
      if (batchCompleteTimer) {
        clearInterval(batchCompleteTimer);
        batchCompleteTimer = null;
      }
      await flushCompletedQueue();
      
      // Calculate total upload time using actual start time
      const totalUploadTimeMs = actualUploadStartTime ? Date.now() - actualUploadStartTime : 0;
      const totalUploadTimeSeconds = Math.round((totalUploadTimeMs / 1000) * 100) / 100; // Round to nearest 0.01s
      
      if (totalUploadTimeSeconds > 0) {
        console.log(`✅ Batch upload completed in ${totalUploadTimeSeconds.toFixed(2)} seconds (${pendingFiles.length} files)`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload batch failed';
      setError(errorMessage);
      setIsPreparing(false);
    } finally {
      setIsUploading(false);
      setIsPreparing(false); // Ensure preparing is cleared even if no uploads started

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
        
        // Calculate total upload time using actual start time (captured from closure)
        // Note: actualUploadStartTime is captured from the closure above
        const totalUploadTimeMs = actualUploadStartTime ? Date.now() - actualUploadStartTime : 0;
        const totalUploadTimeSeconds = Math.round((totalUploadTimeMs / 1000) * 100) / 100; // Round to nearest 0.01s
        
        // Calculate ETA based on elapsed time and progress
        if (actualUploadStartTime && completedCount > 0) {
          const elapsedSeconds = (Date.now() - actualUploadStartTime) / 1000;
          const averageTimePerFile = elapsedSeconds / completedCount;
          const remainingFiles = pendingFiles.length - completedCount;
          const estimatedSeconds = Math.ceil(averageTimePerFile * remainingFiles);
          setEstimatedTimeRemaining(estimatedSeconds);
        }
        
        // Only create batch if ALL files succeeded
        const newBatch = allFilesSucceeded && completedFilesFromBatch.length > 0 ? {
          id: newBatchId,
          files: completedFilesFromBatch,
          completedAt: new Date(),
          totalUploadTimeSeconds: totalUploadTimeSeconds > 0 ? totalUploadTimeSeconds : undefined
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
  }, [uploadState, maxConcurrent, updateFileProgress, updateFileStatus]);

  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    setIsPreparing(false);
    setError('Upload cancelled');
  }, []);

  const reset = useCallback(() => {
    setUploadState({
      activeFiles: [],
      completedBatches: []
    });
    setCurrentBatchId(null);
    setIsUploading(false);
    setIsPreparing(false);
    setError(null);
    setTotalProgress(0);
    setEstimatedTimeRemaining(null);
    setUploadStartTime(null);
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear upload state from localStorage:', err);
    }
  }, []);

  return {
    files: uploadState.activeFiles,
    currentBatchId,
    completedBatches: uploadState.completedBatches,
    isUploading,
    isPreparing,
    totalProgress,
    estimatedTimeRemaining,
    error,
    addFiles,
    removeFile,
    removeAll,
    retryFile,
    retryAllFailed,
    clearLastBatch,
    clearPreviousBatches,
    startUpload,
    cancelUpload,
    reset,
  };
};

