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

export const useUpload = (maxConcurrent: number = 5) => {
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
    
    const uploadQueue = [...pendingFiles];
    const activeUploads = new Set<string>();
    // Always generate a new batch ID for each upload session
    let localBatchId = uuidv4();
    setCurrentBatchId(localBatchId);

    try {
      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];

        // Wait for an available slot
        while (activeUploads.size >= maxConcurrent) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        activeUploads.add(file.id);

        (async () => {
          try {
            updateFileStatus(file.id, 'uploading');

            const initiateResponse = await uploadService.initiateUpload(
              file.file.name,
              file.file.size,
              file.file.type || 'application/octet-stream',
              localBatchId
            );

            // Read file as ArrayBuffer for S3 upload
            const fileData = await readFileAsArrayBuffer(file.file.uri);

            await uploadService.uploadToS3(
              initiateResponse.uploadUrl,
              fileData,
              file.file.type || 'application/octet-stream',
              (progress) => updateFileProgress(file.id, progress)
            );

            await uploadService.completeUpload(initiateResponse.photoId, file.file.size);

            updateFileStatus(file.id, 'completed');
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
              id: localBatchId,
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
  }, [uploadState, currentBatchId, maxConcurrent, updateFileProgress, updateFileStatus]);

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
