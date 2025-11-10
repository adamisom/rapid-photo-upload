import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Linking, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { photoService } from '../services/photoService';
import type { Photo, PhotoListResponse } from '../types';
import { formatFileSize } from '../utils/formatters';

export default function GalleryScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [tagInput, setTagInput] = useState<{ [key: string]: string }>({});
  const [tagErrors, setTagErrors] = useState<{ [key: string]: string }>({});
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({});
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
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
              setDeletingPhotoId(photoId); // Show loading overlay
              await photoService.deletePhoto(photoId);
              setPhotos((prev) => prev.filter((p) => p.id !== photoId));
              setTotalPhotos((prev) => prev - 1);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete photo';
              Alert.alert('Error', message);
            } finally {
              setDeletingPhotoId(null); // Hide loading overlay
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

  const handleAddTag = useCallback(async (photoId: string, tagToAdd?: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const tag = (tagToAdd || tagInput[photoId] || '').trim();
    
    // Validation
    if (!tag) {
      setTagErrors((prev) => ({ ...prev, [photoId]: 'Tag cannot be empty' }));
      return;
    }
    if (tag.length > 50) {
      setTagErrors((prev) => ({ ...prev, [photoId]: 'Tag must be 50 characters or less' }));
      return;
    }
    if (photo.tags && photo.tags.length >= 3) {
      setTagErrors((prev) => ({ ...prev, [photoId]: 'Maximum 3 tags allowed' }));
      return;
    }
    if (photo.tags && photo.tags.includes(tag)) {
      setTagErrors((prev) => ({ ...prev, [photoId]: 'Tag already exists' }));
      return;
    }

    try {
      const newTags = [...(photo.tags || []), tag];
      await photoService.updateTags(photoId, newTags);
      
      // Update local state
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, tags: newTags } : p))
      );
      
      // Clear input and error
      setTagInput((prev) => ({ ...prev, [photoId]: '' }));
      setTagErrors((prev) => ({ ...prev, [photoId]: '' }));
      setShowSuggestions((prev) => ({ ...prev, [photoId]: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add tag';
      setTagErrors((prev) => ({ ...prev, [photoId]: message }));
    }
  }, [photos, tagInput]);

  const selectSuggestion = useCallback((photoId: string, suggestion: string) => {
    setTagInput((prev) => ({ ...prev, [photoId]: suggestion }));
    setShowSuggestions((prev) => ({ ...prev, [photoId]: false }));
    void handleAddTag(photoId, suggestion);
  }, [handleAddTag]);

  const handleRemoveTag = useCallback(async (photoId: string, tagToRemove: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || !photo.tags) return;

    try {
      const newTags = photo.tags.filter((t) => t !== tagToRemove);
      await photoService.updateTags(photoId, newTags);
      
      // Update local state
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, tags: newTags } : p))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove tag';
      Alert.alert('Error', message);
    }
  }, [photos]);

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
                  {/* Deleting overlay */}
                  {deletingPhotoId === item.id && (
                    <View style={styles.deletingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.deletingText}>Deleting...</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.photoName} numberOfLines={1}>
                  {item.originalFilename}
                </Text>
                <Text style={styles.photoSize}>
                  {formatFileSize(item.fileSizeBytes)}
                </Text>
                
                {/* Tags Section */}
                <View style={styles.tagsSection}>
                  <View style={styles.tagsContainer}>
                    {item.tags && item.tags.length > 0 ? (
                      item.tags.map((tag, idx) => (
                        <View key={idx} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                          <TouchableOpacity onPress={() => handleRemoveTag(item.id, tag)}>
                            <Text style={styles.tagRemove}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTags}>No tags</Text>
                    )}
                  </View>
                  
                  {/* Error message */}
                  {tagErrors[item.id] && (
                    <Text style={styles.tagError}>{tagErrors[item.id]}</Text>
                  )}
                  
                  {/* Add tag input */}
                  {(!item.tags || item.tags.length < 3) && (
                    <View style={styles.tagInputWrapper}>
                      <View style={styles.tagInputContainer}>
                        <TextInput
                          style={styles.tagInput}
                          placeholder="Add tag..."
                          maxLength={50}
                          value={tagInput[item.id] || ''}
                          onChangeText={(text) => {
                            setTagInput((prev) => ({ ...prev, [item.id]: text }));
                            setShowSuggestions((prev) => ({ ...prev, [item.id]: text.length > 0 }));
                            if (tagErrors[item.id]) {
                              setTagErrors((prev) => ({ ...prev, [item.id]: '' }));
                            }
                          }}
                          onFocus={() => {
                            if ((tagInput[item.id] || '').length > 0) {
                              setShowSuggestions((prev) => ({ ...prev, [item.id]: true }));
                            }
                          }}
                          onBlur={() => {
                            // Delay to allow suggestion click
                            setTimeout(() => {
                              setShowSuggestions((prev) => ({ ...prev, [item.id]: false }));
                            }, 200);
                          }}
                          onSubmitEditing={() => handleAddTag(item.id)}
                        />
                        <TouchableOpacity
                          style={styles.tagAddButton}
                          onPress={() => handleAddTag(item.id)}
                        >
                          <Text style={styles.tagAddButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Tag suggestions dropdown */}
                      {showSuggestions[item.id] && getTagSuggestions(item.id).length > 0 && (
                        <View style={styles.suggestionsDropdown}>
                          {getTagSuggestions(item.id).map((suggestion, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => selectSuggestion(item.id, suggestion)}
                              style={styles.suggestionItem}
                            >
                              <Text style={styles.suggestionText}>{suggestion}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
                
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
    paddingTop: 60,
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
  deletingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
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
    marginBottom: 8,
  },
  tagsSection: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    minHeight: 24,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#1976d2',
    marginRight: 4,
  },
  tagRemove: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  noTags: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  tagError: {
    fontSize: 10,
    color: '#cc0000',
    marginBottom: 4,
  },
  tagInputWrapper: {
    position: 'relative',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    marginRight: 4,
  },
  tagAddButton: {
    backgroundColor: '#0066cc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 30,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginTop: 2,
    maxHeight: 120,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 11,
    color: '#333',
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

