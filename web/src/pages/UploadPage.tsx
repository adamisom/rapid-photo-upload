/**
 * ============================================================================
 * UPLOAD PAGE
 * ============================================================================
 * 
 * Photo upload interface with drag-and-drop, file selection, and progress tracking
 */

import { useRef } from 'react';
import { useUpload, type UploadBatch } from '../hooks/useUpload';
import ProgressBar from '../components/ProgressBar';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { 
    files, 
    completedBatches,
    isUploading, 
    totalProgress,
    estimatedTimeRemaining,
    error, 
    addFiles, 
    removeFile,
    removeAll,
    retryFile,
    clearLastBatch, 
    clearPreviousBatches, 
    startUpload 
  } = useUpload(20);

  // Derive lastBatch and previousBatches from single array
  const lastBatch = completedBatches[0] || null;
  const previousBatches = completedBatches.slice(1);

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
    const allFiles = Array.from(e.dataTransfer.files);
    const droppedFiles = allFiles.filter((file) =>
      file.type.startsWith('image/')
    );
    
    // Log if some files were filtered out
    const nonImageCount = allFiles.length - droppedFiles.length;
    if (nonImageCount > 0) {
      console.warn(`Filtered out ${nonImageCount} non-image file(s) from drop`);
    }
    
    // Log large batch drop
    if (droppedFiles.length > 100) {
      console.log(`Large batch dropped: ${droppedFiles.length} files`);
    }
    
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
      
      // Log if some files were filtered out (not images)
      const nonImageCount = selectedFiles.length - imageFiles.length;
      if (nonImageCount > 0) {
        console.warn(`Filtered out ${nonImageCount} non-image file(s)`);
      }
      
      // Log large batch selection
      if (imageFiles.length > 100) {
        console.log(`Large batch selected: ${imageFiles.length} files`);
      }
      
      if (imageFiles.length > 0) {
        addFiles(imageFiles);
      }
      
      // Reset input to allow selecting the same files again if needed
      e.target.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Helper to render a batch section
  const renderBatchFiles = (batch: UploadBatch) => (
    <div className="space-y-2">
      {batch.files.map((file) => (
        <div key={`${batch.id}-${file.id}`} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-start space-x-3">
            {/* Status Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              {file.status === 'completed' && (
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {file.status === 'failed' && (
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900 truncate text-sm">{file.file.name}</p>
                <p className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  file.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {file.status === 'completed' ? 'Done' : 'Failed'}
                </p>
              </div>
              <p className="text-xs text-gray-500">{formatFileSize(file.file.size)}</p>
              {file.error && (
                <p className="text-xs text-red-600 mt-2">{file.error}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Upload Photos</h1>
          <p className="text-lg text-gray-600">Drag and drop your photos or click to browse</p>
        </div>

        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 mb-8 bg-white shadow-sm"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Drag and drop photos here</p>
              <p className="text-gray-500 mt-2">or <span className="text-blue-600 font-semibold">click to browse</span> your computer</p>
              <p className="text-xs text-gray-400 mt-3">Supports JPG, PNG, GIF, WebP up to 100MB per file</p>
              <p className="text-xs text-gray-400 mt-1">Large batches (1000+ files) are supported - uploads process 5 at a time</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            // Note: Browsers may have practical limits on file selection (varies by browser)
            // For very large batches (1000+), consider splitting into multiple selections
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* File List & Progress */}
        {files.length > 0 && (
          <div className="space-y-6">
            {/* File Summary Card (shown when files selected) */}
            {!isUploading && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-indigo-600">Ready to Upload</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Total size: {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={removeAll}
                      className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors flex items-center space-x-1 px-2 py-1.5 rounded-lg hover:bg-red-50"
                      title="Remove all files"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Remove All</span>
                    </button>
                    <div className="bg-indigo-100 rounded-full p-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overall Progress */}
            {isUploading && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {files.filter((f) => f.status === 'completed').length} of {files.length} files uploaded successfully
                    </p>
                    {files.filter((f) => f.status === 'failed').length > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {files.filter((f) => f.status === 'failed').length} failed
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(totalProgress)}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {files.filter((f) => f.status === 'uploading').length} uploading
                    </p>
                    {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        ~{formatTimeRemaining(estimatedTimeRemaining)} remaining
                      </p>
                    )}
                  </div>
                </div>
                <ProgressBar
                  progress={totalProgress}
                  size="lg"
                  showPercentage={false}
                />
              </div>
            )}

            {/* Success Summary (when upload complete) */}
            {!isUploading && files.some((f) => f.status === 'completed' || f.status === 'failed') && (
              <div className={`rounded-xl border p-6 shadow-sm ${
                files.every((f) => f.status === 'completed')
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  : files.filter((f) => f.status === 'completed').length === 0
                    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                    : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    files.every((f) => f.status === 'completed')
                      ? 'bg-green-100'
                      : files.filter((f) => f.status === 'completed').length === 0
                        ? 'bg-red-100'
                        : 'bg-yellow-100'
                  }`}>
                    {files.every((f) => f.status === 'completed') ? (
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : files.filter((f) => f.status === 'completed').length === 0 ? (
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${
                      files.every((f) => f.status === 'completed')
                        ? 'text-green-900'
                        : files.filter((f) => f.status === 'completed').length === 0
                          ? 'text-red-900'
                          : 'text-yellow-900'
                    }`}>
                      {files.every((f) => f.status === 'completed')
                        ? 'All files uploaded successfully!'
                        : files.filter((f) => f.status === 'completed').length === 0
                          ? 'Upload failed'
                          : 'Upload completed with errors'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      files.every((f) => f.status === 'completed')
                        ? 'text-green-700'
                        : files.filter((f) => f.status === 'completed').length === 0
                          ? 'text-red-700'
                          : 'text-yellow-700'
                    }`}>
                      {files.filter((f) => f.status === 'completed').length} succeeded
                      {files.filter((f) => f.status === 'failed').length > 0 && 
                        `, ${files.filter((f) => f.status === 'failed').length} failed`}
                      {files.filter((f) => f.status === 'failed').length > 0 && 
                        ' - Click Retry to try again'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {!isUploading && (
              <div className="space-y-3">
                {files.length >= 6 && (
                  <p className="text-xs text-center text-gray-500 bg-blue-50 border border-blue-100 rounded-lg py-2 px-3">
                    💡 Tip: Large batches upload 20 files at a time for optimal performance
                  </p>
                )}
                <button
                  onClick={startUpload}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Start Upload ({files.length} file{files.length !== 1 ? 's' : ''})</span>
                </button>
              </div>
            )}

            {/* Active File Items */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {files.map((file) => (
                <div key={file.id} className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-4">
                  <div className="flex items-start space-x-3">
                    {/* Thumbnail / Status Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {file.status === 'completed' && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {file.status === 'failed' && (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      {file.status === 'uploading' && (
                        <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                      {file.status === 'pending' && (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-900 truncate text-sm">{file.file.name}</p>
                        <p className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          file.status === 'completed' ? 'bg-green-100 text-green-700' :
                          file.status === 'failed' ? 'bg-red-100 text-red-700' :
                          file.status === 'uploading' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {file.status === 'completed' ? 'Done' :
                           file.status === 'failed' ? 'Failed' :
                           file.status === 'uploading' ? 'Uploading' :
                           'Waiting'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.file.size)}</p>

                      {/* Progress Bar */}
                      {(file.status === 'uploading' || file.progress > 0) && (
                        <ProgressBar progress={file.progress} size="sm" showPercentage={true} />
                      )}

                      {/* Error Message */}
                      {file.error && (
                        <p className="text-xs text-red-600 mt-2">{file.error}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {!isUploading && (
                      <div className="flex items-center space-x-2">
                        {/* Retry Button (only for failed files) */}
                        {file.status === 'failed' && (
                          <button
                            onClick={() => retryFile(file.id)}
                            className="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                            aria-label="Retry upload"
                            title="Retry upload"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        {/* Remove Button */}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                          aria-label="Remove file"
                          title="Remove file"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Last Batch */}
        {lastBatch && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Last Batch</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {lastBatch.files.length} file{lastBatch.files.length !== 1 ? 's' : ''} • 
                  {' '}{lastBatch.files.filter((f) => f.status === 'completed').length} completed, 
                  {' '}{lastBatch.files.filter((f) => f.status === 'failed').length} failed
                </p>
              </div>
              <button
                onClick={clearLastBatch}
                className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear Last Batch</span>
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto pr-2">
              {renderBatchFiles(lastBatch)}
            </div>
          </div>
        )}

        {/* Section 3: Previous Batches */}
        {previousBatches.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Previous Batches</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {previousBatches.length} batch{previousBatches.length !== 1 ? 'es' : ''}
                </p>
              </div>
              <button
                onClick={clearPreviousBatches}
                className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear All Previous</span>
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2 space-y-6">
              {previousBatches.map((batch, index) => (
                <div key={batch.id} className="border-l-4 border-gray-300 pl-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Batch {previousBatches.length - index} • 
                    {' '}{batch.files.filter((f) => f.status === 'completed').length} completed, 
                    {' '}{batch.files.filter((f) => f.status === 'failed').length} failed
                  </p>
                  {renderBatchFiles(batch)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && !lastBatch && previousBatches.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No files selected yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

