import { useState, useCallback } from 'react';
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

export const useUpload = (maxConcurrent: number = 5) => {
  const [files, setFiles] = useState<MobileUploadFile[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);

  const addFile = useCallback((file: MobileUploadFile['file']) => {
    const newFile: MobileUploadFile = {
      id: uuidv4(),
      file,
      status: 'pending',
      progress: 0,
    };
    setFiles((prev) => [...prev, newFile]);
    return newFile.id;
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const updateFileProgress = useCallback((fileId: string, progress: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, progress } : f
      )
    );
    // Update total progress
    const updatedFiles = files.map((f) =>
      f.id === fileId ? { ...f, progress } : f
    );
    const totalP = updatedFiles.reduce((sum, f) => sum + f.progress, 0) / updatedFiles.length;
    setTotalProgress(totalP);
  }, [files]);

  const updateFileStatus = useCallback(
    (fileId: string, status: MobileUploadFile['status'], error?: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status, error } : f
        )
      );
    },
    []
  );

  const startUpload = useCallback(async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const uploadQueue = [...files];
    const activeUploads = new Set<string>();

    try {
      let currentBatchId = batchId;

      for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];

        while (activeUploads.size >= maxConcurrent) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        activeUploads.add(file.id);

        (async () => {
          try {
            updateFileStatus(file.id, 'uploading');

            // Only pass batchId if it already exists (after first file)
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
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            updateFileStatus(file.id, 'failed', errorMessage);
            console.error(`Upload failed for ${file.file.name}:`, err);
          } finally {
            activeUploads.delete(file.id);
          }
        })();
      }
    } finally {
      setIsUploading(false);
    }
  }, [files, batchId, maxConcurrent, updateFileProgress, updateFileStatus]);

  const cancelUpload = useCallback(() => {
    setFiles([]);
    setBatchId(null);
    setTotalProgress(0);
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    setBatchId(null);
    setTotalProgress(0);
    setIsUploading(false);
  }, []);

  return {
    files,
    batchId,
    isUploading,
    totalProgress,
    addFile,
    removeFile,
    updateFileProgress,
    updateFileStatus,
    startUpload,
    cancelUpload,
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

