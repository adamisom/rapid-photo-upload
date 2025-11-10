/**
 * Gallery Page - Display uploaded photos
 */

import { useState, useEffect } from 'react';
import { photoService } from '../services/photoService';
import type { PhotoDto, PhotoListResponse } from '../types';
import Alert from '../components/Alert';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tagErrors, setTagErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const pageSize = 20;

  // Get all unique tags from user's photos for autocomplete
  const getAllUserTags = (): string[] => {
    const tagSet = new Set<string>();
    photos.forEach(photo => {
      photo.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  };

  // Get filtered tag suggestions based on input
  const getTagSuggestions = (photoId: string): string[] => {
    const input = (tagInput[photoId] || '').toLowerCase().trim();
    if (!input) return [];

    const photo = photos.find(p => p.id === photoId);
    const existingTags = photo?.tags || [];
    
    return getAllUserTags()
      .filter(tag => 
        tag.toLowerCase().includes(input) && 
        !existingTags.includes(tag)
      )
      .slice(0, 5); // Show max 5 suggestions
  };

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: PhotoListResponse = await photoService.getPhotos(page, pageSize);
      setPhotos(response.photos);
      setTotalPhotos(response.totalCount);
    } catch (err) {
      console.error('Failed to load photos:', err);
      const message = err instanceof Error ? err.message : 'Failed to load photos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (photoId: string, filename: string) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;

    try {
      await photoService.deletePhoto(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      setTotalPhotos(totalPhotos - 1);
    } catch (err) {
      console.error('Failed to delete photo:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete photo';
      setError(message);
    }
  };

  const handleAddTag = async (e: React.FormEvent, photoId: string, overrideTag?: string) => {
    e.preventDefault();
    const tag = overrideTag || (tagInput[photoId] || '').trim();

    if (!tag) return;

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    // Clear previous error for this photo
    setTagErrors(prev => {
      const updated = { ...prev };
      delete updated[photoId];
      return updated;
    });

    // Validate
    if (tag.length > 50) {
      setTagErrors(prev => ({ ...prev, [photoId]: 'Tag must be 50 characters or less' }));
      return;
    }

    if (photo.tags && photo.tags.length >= 3) {
      setTagErrors(prev => ({ ...prev, [photoId]: 'Maximum 3 tags allowed' }));
      return;
    }

    if (photo.tags && photo.tags.includes(tag)) {
      setTagErrors(prev => ({ ...prev, [photoId]: 'Tag already exists' }));
      return;
    }

    try {
      const newTags = [...(photo.tags || []), tag];
      await photoService.updateTags(photoId, newTags);
      
      // Update local state
      setPhotos(photos.map(p => 
        p.id === photoId ? { ...p, tags: newTags } : p
      ));
      
      // Clear input and hide suggestions
      setTagInput(prev => ({ ...prev, [photoId]: '' }));
      setShowSuggestions(prev => ({ ...prev, [photoId]: false }));
    } catch (err) {
      console.error('Failed to add tag:', err);
      const message = err instanceof Error ? err.message : 'Failed to add tag';
      setTagErrors(prev => ({ ...prev, [photoId]: message }));
    }
  };

  const selectSuggestion = (photoId: string, tag: string) => {
    setShowSuggestions(prev => ({ ...prev, [photoId]: false }));
    // Pass the tag directly to avoid state timing issues
    handleAddTag({ preventDefault: () => {} } as React.FormEvent, photoId, tag);
  };

  const handleRemoveTag = async (photoId: string, tagToRemove: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    // Clear error for this photo
    setTagErrors(prev => {
      const updated = { ...prev };
      delete updated[photoId];
      return updated;
    });

    try {
      const newTags = (photo.tags || []).filter(t => t !== tagToRemove);
      await photoService.updateTags(photoId, newTags);
      
      // Update local state
      setPhotos(photos.map(p => 
        p.id === photoId ? { ...p, tags: newTags } : p
      ));
    } catch (err) {
      console.error('Failed to remove tag:', err);
      const message = err instanceof Error ? err.message : 'Failed to remove tag';
      setTagErrors(prev => ({ ...prev, [photoId]: message }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const totalPages = Math.ceil(totalPhotos / pageSize);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Photo Gallery</h1>
          <p className="text-lg text-gray-600">Browse and manage your uploaded photos</p>
        </div>

        {error && <Alert type="error" message={error} />}

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block">
                <svg className="w-12 h-12 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-gray-600 mt-4">Loading your photos...</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <svg className="w-16 h-16 text-blue-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 text-lg font-medium">No photos yet</p>
            <p className="text-gray-500 mt-1">Start uploading photos to see them here</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600"><span className="font-bold text-gray-900">{totalPhotos}</span> photo{totalPhotos !== 1 ? 's' : ''} in total</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {photos.map(photo => (
                <div key={photo.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                  {/* Photo Preview */}
                  <a
                    href={photo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-200 aspect-square overflow-hidden relative"
                  >
                    <img
                      src={photo.downloadUrl}
                      alt={photo.originalFilename}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </a>

                  {/* Photo Info */}
                  <div className="p-4">
                    <a
                      href={photo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-semibold text-gray-900 truncate hover:text-blue-600 mb-1 text-sm"
                      title={photo.originalFilename}
                    >
                      {photo.originalFilename}
                    </a>
                    <p className="text-xs text-gray-500 mb-3">
                      {formatFileSize(photo.fileSizeBytes)}
                    </p>

                    {/* Tags Section */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
                        {photo.tags && photo.tags.length > 0 ? (
                          photo.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {tag}
                              <button
                                onClick={() => handleRemoveTag(photo.id, tag)}
                                className="hover:text-blue-900 transition-colors"
                                title="Remove tag"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No tags</span>
                        )}
                      </div>
                      
                      {/* Inline error message */}
                      {tagErrors[photo.id] && (
                        <div className="mb-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          {tagErrors[photo.id]}
                        </div>
                      )}
                      
                      {(!photo.tags || photo.tags.length < 3) && (
                        <div className="relative">
                          <form onSubmit={(e) => handleAddTag(e, photo.id)} className="flex gap-1">
                            <input
                              type="text"
                              maxLength={50}
                              placeholder="Add tag..."
                              value={tagInput[photo.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setTagInput(prev => ({ ...prev, [photo.id]: value }));
                                setShowSuggestions(prev => ({ ...prev, [photo.id]: value.length > 0 }));
                              }}
                              onBlur={() => {
                                // Delay to allow click on suggestion
                                setTimeout(() => {
                                  setShowSuggestions(prev => ({ ...prev, [photo.id]: false }));
                                }, 200);
                              }}
                              onFocus={() => {
                                if ((tagInput[photo.id] || '').length > 0) {
                                  setShowSuggestions(prev => ({ ...prev, [photo.id]: true }));
                                }
                              }}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="submit"
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                              title="Add tag"
                            >
                              +
                            </button>
                          </form>
                          
                          {/* Tag suggestions dropdown */}
                          {showSuggestions[photo.id] && getTagSuggestions(photo.id).length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                              {getTagSuggestions(photo.id).map((suggestion, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => selectSuggestion(photo.id, suggestion)}
                                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(photo.id, photo.originalFilename)}
                      className="w-full px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-4 bg-white rounded-lg border border-gray-200">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="text-sm text-gray-700 font-medium">
                  Page <span className="font-bold">{page + 1}</span> of <span className="font-bold">{totalPages}</span> • <span className="text-gray-500">{totalPhotos} photos total</span>
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 font-medium flex items-center space-x-1"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

