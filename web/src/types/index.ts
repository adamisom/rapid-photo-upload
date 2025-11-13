/**
 * ============================================================================
 * FRONTEND TYPE DEFINITIONS
 * ============================================================================
 * 
 * Central location for all TypeScript interfaces and types used in the
 * RapidPhotoUpload web frontend.
 * 
 * Organization:
 * - Auth types
 * - Photo types
 * - Upload types
 * - API Response types
 * 
 * These are derived from backend API responses (see backend docs/ARCHITECTURE.md)
 */

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  logout: () => void;
  refreshAuth: () => void;
}

// ============================================================================
// PHOTO TYPES
// ============================================================================

export type PhotoStatus = 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

export interface Photo {
  id: string;
  originalFilename: string;
  fileSizeBytes: number;
  downloadUrl: string;
  uploadedAt: string;
  tags: string[];
}

export interface PhotoListResponse {
  photos: Photo[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface PhotoDto {
  id: string;
  originalFilename: string;
  fileSizeBytes: number;
  downloadUrl: string;
  uploadedAt: string;
  tags: string[];
}

export interface PhotoStatusDto {
  id: string;
  originalFilename: string;
  status: PhotoStatus;
  errorMessage: string | null;
  updatedAt: string;
}

// ============================================================================
// UPLOAD TYPES
// ============================================================================

export interface InitiateUploadRequest {
  filename: string;
  fileSizeBytes: number;
  contentType: string;
  batchId?: string;
}

export interface InitiateUploadResponse {
  photoId: string;
  uploadUrl: string;
  expiresInMinutes: number;
  batchId: string;
}

export interface UploadCompleteRequest {
  fileSizeBytes: number;
  eTag?: string;
}

export interface BatchCompleteItem {
  photoId: string;
  fileSizeBytes: number;
  eTag?: string;
}

export interface BatchCompleteRequest {
  items: BatchCompleteItem[];
}

export interface BatchCompleteResponse {
  status: 'success';
  processed: number;
  total: number;
}

export interface UploadFailedRequest {
  errorMessage: string;
}

export interface BatchStatusResponse {
  batchId: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  photos: PhotoStatusDto[];
}

// ============================================================================
// CLIENT-SIDE UPLOAD TRACKING
// ============================================================================

export type UploadFileStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface UploadFile {
  id: string; // client-generated UUID
  file: File;
  photoId?: string; // backend photo ID, set after initiate
  batchId?: string;
  status: UploadFileStatus;
  progress: number; // 0-100
  error?: string;
  presignedUrl?: string;
  expiresAt?: number;
}

export interface UploadSession {
  batchId: string;
  files: UploadFile[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  startTime: number;
  endTime?: number;
}

// ============================================================================
// API RESPONSE TYPES (Generic)
// ============================================================================

export interface ApiError {
  timestamp: string;
  status: number;
  message: string;
  path: string;
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface GenericStatusResponse {
  status: 'success' | 'error';
  message?: string;
}

