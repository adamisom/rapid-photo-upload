/**
 * Utility functions for formatting file sizes and time durations
 */

/**
 * Format bytes into human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "250 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format seconds into human-readable time remaining
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "5m 30s", "2h 15m")
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format seconds into upload time display (e.g., "45s" or "9m 12s")
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "45s", "9m 12s")
 */
export function formatUploadTime(seconds: number | undefined | null): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '0s';
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

