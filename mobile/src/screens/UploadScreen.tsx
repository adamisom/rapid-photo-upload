import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '../hooks/useUpload';
import ProgressBar from '../components/ProgressBar';

export default function UploadScreen() {
  const [loading, setLoading] = useState(false);
  const { files, isUploading, totalProgress, addFile, removeFile, startUpload, reset } = useUpload();

  const selectPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll access is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        result.assets.forEach((asset) => {
          addFile({
            uri: asset.uri,
            name: asset.filename || `photo_${Date.now()}.jpg`,
            type: asset.type === 'image' ? 'image/jpeg' : 'image/png',
            size: asset.fileSize || 0,
          });
        });
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos');
    } finally {
      setLoading(false);
    }
  }, [addFile]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      Alert.alert('No photos', 'Please select photos first');
      return;
    }
    await startUpload();
  }, [files.length, startUpload]);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      removeFile(fileId);
    },
    [removeFile]
  );

  const handleClear = useCallback(() => {
    if (isUploading) {
      Alert.alert('Upload In Progress', 'Cannot clear files while uploading');
      return;
    }
    reset();
  }, [isUploading, reset]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Photos</Text>

      <TouchableOpacity
        style={[styles.button, (loading || isUploading) && styles.buttonDisabled]}
        onPress={selectPhotos}
        disabled={loading || isUploading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Select Photos</Text>
        )}
      </TouchableOpacity>

      {totalProgress > 0 && isUploading && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {Math.round(totalProgress)}% complete
          </Text>
          <ProgressBar progress={totalProgress} />
        </View>
      )}

      {files.length > 0 && (
        <View style={styles.selectedPhotos}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedCount}>{files.length} photo(s) selected</Text>
            <TouchableOpacity onPress={handleClear} disabled={isUploading}>
              <Text style={[styles.clearButton, isUploading && styles.buttonDisabled]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={files}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {item.file.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                  {item.status === 'uploading' && (
                    <>
                      <ProgressBar progress={item.progress} />
                      <Text style={styles.progressPercent}>{Math.round(item.progress)}%</Text>
                    </>
                  )}
                  {item.status === 'completed' && (
                    <Text style={styles.statusCompleted}>✓ Uploaded</Text>
                  )}
                  {item.status === 'failed' && (
                    <Text style={styles.statusFailed}>✗ {item.error}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFile(item.id)}
                  disabled={isUploading || item.status === 'uploading'}
                >
                  <Text style={[styles.removeButton, (isUploading || item.status === 'uploading') && styles.buttonDisabled]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={false}
          />

          <TouchableOpacity
            style={[styles.button, styles.uploadButton, isUploading && styles.buttonDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Upload All</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {files.length === 0 && !isUploading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos selected</Text>
          <Text style={styles.emptySubtext}>Tap &quot;Select Photos&quot; to get started</Text>
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
  progressSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  progressPercent: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  selectedPhotos: {
    marginTop: 20,
    flex: 1,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    color: '#cc0000',
    fontSize: 14,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    color: '#cc0000',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 10,
  },
  statusCompleted: {
    fontSize: 12,
    color: '#00aa00',
    marginTop: 6,
    fontWeight: '600',
  },
  statusFailed: {
    fontSize: 12,
    color: '#cc0000',
    marginTop: 6,
    fontWeight: '600',
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
});

