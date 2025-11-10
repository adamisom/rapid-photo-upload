// Auth Types
export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Upload Types
export interface InitiateUploadResponse {
  photoId: string;
  uploadUrl: string;
  batchId: string;
}

export interface UploadFile {
  id: string;
  file: any; // React Native file object
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface UploadSession {
  batchId: string;
  files: UploadFile[];
  status: 'idle' | 'uploading' | 'completed' | 'failed';
  totalProgress: number;
}

// Photo Types
export interface Photo {
  id: string;
  originalFilename: string;
  fileSizeBytes: number;
  uploadedAt: string;
  downloadUrl: string;
  tags: string[];
}

export interface PhotoListResponse {
  photos: Photo[];
  totalCount: number;
}

// Error Types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

