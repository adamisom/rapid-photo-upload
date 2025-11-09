import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import type { Photo } from '../types';

export default function GalleryScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_page] = useState(0);
  const _pageSize = 20;

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      // In Phase 6.3, implement photo fetching from backend
      // For now, show empty gallery
      setPhotos([]);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPhotos();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    // In Phase 6.3, implement photo deletion
    alert('Delete implementation coming in Phase 6.3');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Photos</Text>

      {photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet</Text>
          <Text style={styles.emptySubtext}>Go to Upload tab to add photos</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.photoCard}>
              <Image
                source={{ uri: item.downloadUrl }}
                style={styles.photoImage}
              />
              <Text style={styles.photoName} numberOfLines={1}>
                {item.originalFilename}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
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
});

