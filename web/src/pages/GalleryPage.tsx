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
  const [page, setPage] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const pageSize = 20;

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

  const totalPages = Math.ceil(totalPhotos / pageSize);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Photo Gallery</h1>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading photos...</p>
          </div>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No photos yet. Start uploading!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {photos.map(photo => (
              <div key={photo.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Photo Preview */}
                <a
                  href={photo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-200 aspect-square overflow-hidden"
                >
                  <img
                    src={photo.downloadUrl}
                    alt={photo.originalFilename}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </a>

                {/* Photo Info */}
                <div className="p-4">
                  <a
                    href={photo.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-semibold text-gray-900 truncate hover:text-blue-600 mb-1"
                  >
                    {photo.originalFilename}
                  </a>
                  <p className="text-sm text-gray-600 mb-3">
                    {(photo.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(photo.id, photo.originalFilename)}
                    className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded transition-colors"
              >
                ← Previous
              </button>

              <div className="text-gray-600">
                Page {page + 1} of {totalPages} ({totalPhotos} photos)
              </div>

              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

