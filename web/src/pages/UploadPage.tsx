/**
 * ============================================================================
 * UPLOAD PAGE
 * ============================================================================
 * 
 * Photo upload interface with drag-and-drop, file selection, and progress tracking
 */

import { useRef } from 'react';
import { useUpload } from '../hooks/useUpload';
import ProgressBar from '../components/ProgressBar';

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { files, isUploading, totalProgress, error, addFiles, removeFile, startUpload } = useUpload(5);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('bg-blue-50', 'border-blue-300');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('bg-blue-50', 'border-blue-300');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('bg-blue-50', 'border-blue-300');
    }
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files).filter((file) => file.type.startsWith('image/')));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✕';
      case 'uploading':
        return '⟳';
      default:
        return '◯';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Photos</h1>
        <p className="text-gray-600">Select or drag and drop your photos to upload them</p>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors mb-8"
      >
        <div className="flex flex-col items-center space-y-2">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>
            <p className="text-lg font-semibold text-gray-900">Drag and drop photos here</p>
            <p className="text-sm text-gray-500 mt-1">or click to select files</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* File List & Progress */}
      {files.length > 0 && (
        <div className="space-y-6">
          {/* Overall Progress */}
          {isUploading && (
            <div className="bg-white rounded-lg shadow p-6">
              <ProgressBar
                progress={totalProgress}
                label="Overall Progress"
                size="lg"
              />
              <p className="text-sm text-gray-600 mt-3">
                {files.filter((f) => f.status === 'completed').length} of {files.length} files uploaded
              </p>
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <button
              onClick={startUpload}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Start Upload ({files.length} file{files.length !== 1 ? 's' : ''})
            </button>
          )}

          {/* File Items */}
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start space-x-4">
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-lg font-semibold ${getStatusColor(file.status)}`}>
                        {getStatusIcon(file.status)}
                      </span>
                      <p className="font-medium text-gray-900 truncate">{file.file.name}</p>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{formatFileSize(file.file.size)}</p>

                    {/* Progress Bar */}
                    {file.status === 'uploading' || file.progress > 0 ? (
                      <ProgressBar progress={file.progress} size="sm" showPercentage={false} />
                    ) : null}

                    {/* Error Message */}
                    {file.error && (
                      <p className="text-sm text-red-600 mt-2">{file.error}</p>
                    )}
                  </div>

                  {/* Status Text */}
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                      {file.status === 'completed'
                        ? 'Done'
                        : file.status === 'failed'
                        ? 'Failed'
                        : file.status === 'uploading'
                        ? 'Uploading'
                        : 'Waiting'}
                    </p>
                  </div>

                  {/* Remove Button */}
                  {!isUploading && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      aria-label="Remove file"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">No files selected yet</p>
        </div>
      )}
    </div>
  );
}

