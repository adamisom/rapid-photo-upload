/**
 * ============================================================================
 * UPLOAD CONTEXT
 * ============================================================================
 * 
 * Global state management for photo upload batches and progress tracking
 */

import { useState, useCallback } from 'react';
import type { UploadFile, UploadSession } from '../types';
import { UploadContext } from './upload';
import type { UploadContextType } from './upload';

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<Map<string, UploadSession>>(new Map());

  const createSession = useCallback(
    (batchId: string, files: File[]): UploadSession => {
      const uploadFiles: UploadFile[] = files.map((file) => ({
        id: `${batchId}-${file.name}-${Date.now()}`,
        file,
        status: 'pending',
        progress: 0,
      }));

      const session: UploadSession = {
        batchId,
        files: uploadFiles,
        totalFiles: files.length,
        completedFiles: 0,
        failedFiles: 0,
        startTime: Date.now(),
      };

      setSessions((prev) => new Map(prev).set(batchId, session));
      return session;
    },
    []
  );

  const updateFileProgress = useCallback((batchId: string, fileId: string, progress: number) => {
    setSessions((prev) => {
      const newSessions = new Map(prev);
      const session = newSessions.get(batchId);
      if (session) {
        const fileIndex = session.files.findIndex((f) => f.id === fileId);
        if (fileIndex >= 0) {
          session.files[fileIndex].progress = Math.min(100, Math.max(0, progress));
          newSessions.set(batchId, { ...session });
        }
      }
      return newSessions;
    });
  }, []);

  const updateFileStatus = useCallback(
    (batchId: string, fileId: string, status: UploadFile['status'], error?: string) => {
      setSessions((prev) => {
        const newSessions = new Map(prev);
        const session = newSessions.get(batchId);
        if (session) {
          const fileIndex = session.files.findIndex((f) => f.id === fileId);
          if (fileIndex >= 0) {
            const oldStatus = session.files[fileIndex].status;
            session.files[fileIndex].status = status;
            if (error) {
              session.files[fileIndex].error = error;
            }

            // Update counters
            if (oldStatus !== 'completed' && status === 'completed') {
              session.completedFiles += 1;
            } else if (oldStatus !== 'failed' && status === 'failed') {
              session.failedFiles += 1;
            }

            if (status === 'completed' || status === 'failed') {
              session.files[fileIndex].progress = 100;
            }

            newSessions.set(batchId, { ...session });
          }
        }
        return newSessions;
      });
    },
    []
  );

  const getSession = useCallback((batchId: string) => {
    return sessions.get(batchId);
  }, [sessions]);

  const clearSession = useCallback((batchId: string) => {
    setSessions((prev) => {
      const newSessions = new Map(prev);
      newSessions.delete(batchId);
      return newSessions;
    });
  }, []);

  const value: UploadContextType = {
    sessions,
    createSession,
    updateFileProgress,
    updateFileStatus,
    getSession,
    clearSession,
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

