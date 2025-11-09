/**
 * ============================================================================
 * useUpload Hook
 * ============================================================================
 * 
 * Custom hook to access upload context
 */

import { useContext } from 'react';
import { UploadContext } from '../context/upload';
import type { UploadContextType } from '../context/upload';

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within UploadProvider');
  }
  return context;
};

