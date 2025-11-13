import { useState, useCallback, useEffect } from 'react';
import { uploadService } from '../services/uploadService';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface MobileUploadFile {
  id: string;
  file: {
    uri: string;
    name: string;
    type: string;
    size: number;
  };
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface UploadBatch {
  id: string;
  files: MobileUploadFile[];
  completedAt: Date;
}

interface UploadState {
  activeFiles: MobileUploadFile[];
  completedBatches: UploadBatch[];
}

export const useUpload = (maxConcurrent: number = 20) => {
  // Combined state for atomic updates (prevents race conditions)
  const [uploadState, setUploadState] = useState<UploadState>({
    activeFiles: [],
    completedBatches: []
  });
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

  // Recalculate progress during upload (byte-based)
  useEffect(() => {
    if (!isUploading) return;
    
    const uploadingFiles = uploadState.activeFiles.filter((f) => 
      f.status === 'uploading' || f.status === 'completed' || f.status === 'pending'
    );
    
    if (uploadingFiles.length === 0) return;
    
    // Calculate progress by bytes, not by file count (more accurate for mixed sizes)
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

  const addFile = useCallback((file: MobileUploadFile['file']) => {
    const newFile: MobileUploadFile = {
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    };
    setUploadState((prev) => ({
      ...prev,
      activeFiles: [...prev.activeFiles, newFile]
    }));
    return newFile.id;
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
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
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
    (fileId: string, status: MobileUploadFile['status'], error?: string) => {
      setUploadState((prev) => ({
        ...prev,
        activeFiles: prev.activeFiles.map((f) =>
          f.id === fileId ? { ...f, status, error } : f
        )
      }));
    },
    []
  );

  const startUpload = useCallback(async () => {
    const pendingFiles = uploadState.activeFiles.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setUploadStartTime(Date.now());
    setTotalProgress(0);
    setEstimatedTimeRemaining(null);
    
    // Generate new batchId when "Start Upload" is clicked
    const newBatchId = uuidv4();
    setCurrentBatchId(newBatchId);

    try {
      // ========================================================================
      // PHASE 1: Pre-request all presigned URLs in parallel batches
      // ========================================================================
      // This eliminates the sequential bottleneck - all URLs ready before uploads start
      const URL_BATCH_SIZE = 50; // Request 50 URLs at a time to avoid overwhelming backend
      const presignedUrlMap = new Map<string, { photoId: string; uploadUrl: string; batchId: string }>();
      
      // Split files into batches for URL requests
      const urlBatches: MobileUploadFile[][] = [];
      for (let i = 0; i < pendingFiles.length; i += URL_BATCH_SIZE) {
        urlBatches.push(pendingFiles.slice(i, i + URL_BATCH_SIZE));
      }
      
      // Request URLs in batches (parallel within batch, sequential between batches)
      for (const batch of urlBatches) {
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
          
          // Store URLs in map for quick lookup
          urlResponses.forEach(({ fileId, response }) => {
            presignedUrlMap.set(fileId, {
              photoId: response.photoId,
              uploadUrl: response.uploadUrl,
              batchId: response.batchId
            });
          });
        } catch (err) {
          // If URL request fails for a batch, mark those files as failed
          console.error('Failed to get presigned URLs for batch:', err);
          batch.forEach(file => {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get upload URL';
            updateFileStatus(file.id, 'failed', errorMessage);
          });
        }
      }
      
      // Filter out files that failed to get URLs
      const filesWithUrls = pendingFiles.filter(f => presignedUrlMap.has(f.id));
      
      if (filesWithUrls.length === 0) {
        setIsUploading(false);
        return;
      }

      // ========================================================================
      // PHASE 2: Upload files to S3 with concurrency control
      // ========================================================================
      const uploadQueue = [...filesWithUrls];
      const activeUploads = new Set<string>();
      
      // Queue for batched complete notifications
      const completedQueue: { photoId: string; fileSize: number }[] = [];
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

      for (const file of uploadQueue) {
        // Wait for a slot (event-driven, not polling)
        await waitForSlot();

        activeUploads.add(file.id);
        const urlData = presignedUrlMap.get(file.id)!;

        // Upload in background without await
        (async () => {
          try {
            updateFileStatus(file.id, 'uploading');

            // Read file as ArrayBuffer for S3 upload
            const fileData = await readFileAsArrayBuffer(file.file.uri);

            // Upload to S3 (URL already obtained in Phase 1)
            await uploadService.uploadToS3(
              urlData.uploadUrl,
              fileData,
              file.file.type || 'application/octet-stream',
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
            
          } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            updateFileStatus(file.id, 'failed', errorMessage);
            console.error(`❌ Upload failed for ${file.file.name}:`, {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status,
            });
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
    } finally {
      setIsUploading(false);
      setUploadStartTime(null);
      
      console.log('📦 Moving to batch history...');
      console.log('   Pending files:', pendingFiles.map(f => ({ id: f.id, name: f.file.name })));
      
      // Move completed files to batch history (only if ALL succeeded)
      setUploadState((current) => {
        console.log('   Current active files:', current.activeFiles.map(f => ({ id: f.id, status: f.status })));
        
        const completedFilesFromBatch = current.activeFiles.filter((f) =>
          f.status === 'completed' &&
          pendingFiles.some((pf) => pf.id === f.id)
        );
        
        console.log('   Completed from batch:', completedFilesFromBatch.length);
        
        const allFilesSucceeded = completedFilesFromBatch.length === pendingFiles.length;
        console.log('   All succeeded?', allFilesSucceeded);
        
        // Only create batch if ALL files succeeded
        const newBatch: UploadBatch | null = allFilesSucceeded && completedFilesFromBatch.length > 0
          ? {
              id: newBatchId,
              files: completedFilesFromBatch,
              completedAt: new Date()
            }
          : null;
        
        console.log('   New batch?', newBatch ? `Yes (${newBatch.files.length} files)` : 'No');
        console.log('   New batch ID:', newBatch?.id);
        console.log('   Existing batch IDs:', current.completedBatches.map(b => b.id));
        
        const newBatches = newBatch
          ? (current.completedBatches.some(b => b.id === newBatch.id)
              ? current.completedBatches
              : [newBatch, ...current.completedBatches])
          : current.completedBatches;
        
        console.log('   Total batches:', newBatches.length);
        console.log('   Final batch IDs:', newBatches.map(b => b.id));
        
        return {
          // Keep failed files in active, remove completed ones
          activeFiles: allFilesSucceeded
            ? current.activeFiles.filter(f =>
                f.status === 'pending' || f.status === 'uploading'
              )
            : current.activeFiles.filter(f =>
                f.status === 'pending' ||
                f.status === 'uploading' ||
                f.status === 'failed' ||
                (f.status === 'completed' && pendingFiles.some(pf => pf.id === f.id))
              ),
          completedBatches: newBatches
        };
      });
    }
  }, [uploadState, maxConcurrent, updateFileProgress, updateFileStatus]);

  const reset = useCallback(() => {
    setUploadState({
      activeFiles: [],
      completedBatches: []
    });
    setCurrentBatchId(null);
    setTotalProgress(0);
    setIsUploading(false);
    setEstimatedTimeRemaining(null);
    setUploadStartTime(null);
  }, []);

  return {
    files: uploadState.activeFiles,
    completedBatches: uploadState.completedBatches,
    currentBatchId,
    isUploading,
    totalProgress,
    estimatedTimeRemaining,
    addFile,
    removeFile,
    removeAll,
    retryFile,
    clearLastBatch,
    clearPreviousBatches,
    startUpload,
    reset,
  };
};

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}
