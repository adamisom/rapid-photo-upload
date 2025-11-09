import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadService } from '../uploadService';

// Mock XMLHttpRequest
const mockXHR = {
  upload: new EventTarget(),
  open: vi.fn(),
  setRequestHeader: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  status: 200,
};

global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

describe('uploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadToS3', () => {
    it('calls progress callback with correct percentage during upload', async () => {
      const onProgress = vi.fn();
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });

      // Setup XHR mock to simulate progress
      let progressCallback: ((event: ProgressEvent) => void) | null = null;
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          progressCallback = callback as any;
        }
      });

      // Start the upload in a non-blocking way
      const uploadPromise = uploadService.uploadToS3('https://presigned.url', mockFile, onProgress);

      // Simulate progress event: 50% complete
      if (progressCallback) {
        progressCallback({
          loaded: 500,
          total: 1000,
          lengthComputable: true,
        } as any);
      }

      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('clamps progress to 0-100 range', async () => {
      const onProgress = vi.fn();
      const mockFile = new File(['test'], 'test.jpg');

      let progressCallback: ((event: ProgressEvent) => void) | null = null;
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          progressCallback = callback as any;
        }
      });

      uploadService.uploadToS3('https://presigned.url', mockFile, onProgress);

      // Simulate progress > 100%
      if (progressCallback) {
        progressCallback({
          loaded: 1500,
          total: 1000,
          lengthComputable: true,
        } as any);
      }

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('resolves promise on successful upload (status 200)', async () => {
      const mockFile = new File(['test'], 'test.jpg');

      let loadCallback: (() => void) | null = null;
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'load') {
          loadCallback = callback as any;
        }
      });
      mockXHR.status = 200;

      const uploadPromise = uploadService.uploadToS3('https://presigned.url', mockFile);

      if (loadCallback) {
        loadCallback();
      }

      await expect(uploadPromise).resolves.toBeUndefined();
    });

    it('rejects promise on network error', async () => {
      const mockFile = new File(['test'], 'test.jpg');

      let errorCallback: (() => void) | null = null;
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          errorCallback = callback as any;
        }
      });

      const uploadPromise = uploadService.uploadToS3('https://presigned.url', mockFile);

      if (errorCallback) {
        errorCallback();
      }

      await expect(uploadPromise).rejects.toThrow('Network error');
    });

    it('rejects promise on abort', async () => {
      const mockFile = new File(['test'], 'test.jpg');

      let abortCallback: (() => void) | null = null;
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'abort') {
          abortCallback = callback as any;
        }
      });

      const uploadPromise = uploadService.uploadToS3('https://presigned.url', mockFile);

      if (abortCallback) {
        abortCallback();
      }

      await expect(uploadPromise).rejects.toThrow('aborted');
    });

    it('sets correct headers for S3 upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      mockXHR.addEventListener.mockImplementation(() => {});

      uploadService.uploadToS3('https://presigned.url', mockFile);

      expect(mockXHR.open).toHaveBeenCalledWith('PUT', 'https://presigned.url');
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });

    it('sends file in request body', async () => {
      const mockFile = new File(['test content'], 'test.jpg');

      mockXHR.addEventListener.mockImplementation(() => {});

      uploadService.uploadToS3('https://presigned.url', mockFile);

      expect(mockXHR.send).toHaveBeenCalledWith(mockFile);
    });
  });
});

