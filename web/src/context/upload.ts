/**
 * ============================================================================
 * UPLOAD CONTEXT (Separate from Provider)
 * ============================================================================
 * 
 * React Context for upload state - separated from provider for ESLint compliance
 */

import { createContext } from 'react';
import type { UploadFile, UploadSession } from '../types';

export interface UploadContextType {
  sessions: Map<string, UploadSession>;
  createSession: (batchId: string, files: File[]) => UploadSession;
  updateFileProgress: (batchId: string, fileId: string, progress: number) => void;
  updateFileStatus: (batchId: string, fileId: string, status: UploadFile['status'], error?: string) => void;
  getSession: (batchId: string) => UploadSession | undefined;
  clearSession: (batchId: string) => void;
}

export const UploadContext = createContext<UploadContextType | undefined>(undefined);

