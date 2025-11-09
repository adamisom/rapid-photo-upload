import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { photoService } from '../services/photoService';
import type { Photo, PhotoListResponse } from '../types';

export default function GalleryScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const pageSize = 20;

  const loadPhotos = useCallback(async () => {
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
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      void loadPhotos();
    }, [loadPhotos])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPhotos();
    } finally {
      setRefreshing(false);
    }
  }, [loadPhotos]);

  const handleDelete = useCallback(
    (photoId: string, filename: string) => {
      Alert.alert('Delete Photo', `Are you sure you want to delete "${filename}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await photoService.deletePhoto(photoId);
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
              setTotalPhotos((prev) => prev - 1);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete photo';
              Alert.alert('Error', message);
            }
          },
        },
      ]);
    },
    []
  );

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Failed to open photo');
    }
  }, []);

  const handleNextPage = useCallback(() => {
    if ((page + 1) * pageSize < totalPhotos) {
      setPage((prev) => prev + 1);
    }
  }, [page, totalPhotos]);

  const handlePrevPage = useCallback(() => {
    if (page > 0) {
      setPage((prev) => prev - 1);
    }
  }, [page]);

  if (loading && photos.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" style={styles.centerContent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Photos</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {photos.length === 0 && !error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>Go to Upload tab to add photos</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <View style={styles.photoCard}>
                <TouchableOpacity onPress={() => handleDownload(item.downloadUrl, item.originalFilename)}>
                  <Image
                    source={{ uri: item.downloadUrl }}
                    style={styles.photoImage}
                  />
                </TouchableOpacity>
                <Text style={styles.photoName} numberOfLines={1}>
                  {item.originalFilename}
                </Text>
                <Text style={styles.photoSize}>
                  {(item.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id, item.originalFilename)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            scrollEnabled={photos.length > 4}
          />

          {totalPhotos > pageSize && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.paginationButton, page === 0 && styles.paginationButtonDisabled]}
                onPress={handlePrevPage}
                disabled={page === 0}
              >
                <Text style={styles.paginationText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.paginationInfo}>
                Page {page + 1} of {Math.ceil(totalPhotos / pageSize)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  (page + 1) * pageSize >= totalPhotos && styles.paginationButtonDisabled,
                ]}
                onPress={handleNextPage}
                disabled={(page + 1) * pageSize >= totalPhotos}
              >
                <Text style={styles.paginationText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#cc0000',
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  photoImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  photoName: {
    padding: 10,
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  photoSize: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#cc0000',
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0066cc',
    borderRadius: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  paginationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationInfo: {
    fontSize: 12,
    color: '#666',
  },
});

