import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface SelectedPhoto {
  id: string;
  uri: string;
  filename: string;
}

export default function UploadScreen() {
  const [photos, _setPhotos] = useState<SelectedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectPhotos = async () => {
    setLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required');
        return;
      }

      // In Phase 6.3, implement full photo selection UI
      // For now, show placeholder
      alert('Photo selection UI coming in Phase 6.3');
    } catch (error) {
      console.error('Error selecting photos:', error);
      alert('Failed to select photos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      alert('Please select photos first');
      return;
    }

    setUploading(true);
    try {
      // Upload logic in Phase 6.3
      alert('Upload implementation coming in Phase 6.3');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Photos</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={selectPhotos}
        disabled={loading || uploading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Select Photos</Text>
        )}
      </TouchableOpacity>

      {photos.length > 0 && (
        <View style={styles.selectedPhotos}>
          <Text style={styles.selectedCount}>{photos.length} photo(s) selected</Text>

          <TouchableOpacity
            style={[styles.button, styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Upload</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos selected</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButton: {
    marginTop: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedPhotos: {
    marginTop: 30,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

