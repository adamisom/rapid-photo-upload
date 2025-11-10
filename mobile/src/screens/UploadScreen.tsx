import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUpload, type UploadBatch } from '../hooks/useUpload';
import ProgressBar from '../components/ProgressBar';
import { formatFileSize, formatTimeRemaining } from '../utils/formatters';

export default function UploadScreen() {
  const [loading, setLoading] = useState(false);
  const { 
    files, 
    completedBatches,
    isUploading, 
    totalProgress,
    estimatedTimeRemaining,
    addFile, 
    removeFile,
    removeAll,
    retryFile,
    clearLastBatch,
    clearPreviousBatches,
    startUpload, 
    reset 
  } = useUpload();

  // Derive lastBatch and previousBatches
  const lastBatch = completedBatches[0] || null;
  const previousBatches = completedBatches.slice(1);

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
    <ScrollView style={styles.container}>
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

      {/* File Summary Card */}
      {files.length > 0 && !isUploading && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryText}>
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.summarySize}>
              {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))} total
            </Text>
          </View>
          <TouchableOpacity onPress={removeAll} style={styles.removeAllButton}>
            <Text style={styles.removeAllText}>Remove All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Overall Progress */}
      {isUploading && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {files.filter(f => f.status === 'completed').length} of {files.length} files uploaded
          </Text>
          <Text style={styles.progressPercent}>{Math.round(totalProgress)}%</Text>
          <ProgressBar progress={totalProgress} />
          {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
            <Text style={styles.etaText}>
              ~{formatTimeRemaining(estimatedTimeRemaining)} remaining
            </Text>
          )}
        </View>
      )}

      {/* Concurrency Tip */}
      {files.length >= 6 && !isUploading && (
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            💡 Tip: Large batches upload 5 files at a time for optimal performance
          </Text>
        </View>
      )}

      {/* Active Files */}
      {files.length > 0 && (
        <View style={styles.filesSection}>
          <Text style={styles.sectionTitle}>
            {isUploading ? 'Uploading...' : 'Ready to Upload'}
          </Text>

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
                    {formatFileSize(item.file.size)}
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
                    <>
                      <Text style={styles.statusFailed}>✗ {item.error}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => retryFile(item.id)}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {!isUploading && item.status !== 'uploading' && (
                  <TouchableOpacity
                    onPress={() => handleRemoveFile(item.id)}
                  >
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            scrollEnabled={false}
          />

          {!isUploading && files.some(f => f.status === 'pending') && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleUpload}
            >
              <Text style={styles.buttonText}>Start Upload</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Last Batch */}
      {lastBatch && (
        <View style={styles.batchSection}>
          <View style={styles.batchHeader}>
            <Text style={styles.sectionTitle}>Last Batch</Text>
            <TouchableOpacity onPress={clearLastBatch}>
              <Text style={styles.clearBatchText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={lastBatch.files}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.batchFileItem}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.file.name}
                </Text>
                <Text style={styles.statusCompleted}>✓</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Previous Batches */}
      {previousBatches.length > 0 && (
        <View style={styles.batchSection}>
          <View style={styles.batchHeader}>
            <Text style={styles.sectionTitle}>Previous Batches ({previousBatches.length})</Text>
            <TouchableOpacity onPress={clearPreviousBatches}>
              <Text style={styles.clearBatchText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.batchSubtext}>
            {previousBatches.reduce((sum, b) => sum + b.files.length, 0)} files total
          </Text>
        </View>
      )}

      {/* Empty State */}
      {files.length === 0 && !lastBatch && !isUploading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos selected</Text>
          <Text style={styles.emptySubtext}>Tap "Select Photos" to get started</Text>
        </View>
      )}
    </ScrollView>
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summarySize: {
    fontSize: 12,
    color: '#666',
  },
  removeAllButton: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  removeAllText: {
    color: '#cc0000',
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  progressPercent: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  etaText: {
    fontSize: 12,
    color: '#0066cc',
    marginTop: 8,
    fontWeight: '600',
  },
  tipBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  tipText: {
    fontSize: 12,
    color: '#1976d2',
    textAlign: 'center',
  },
  filesSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
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
    fontSize: 24,
    fontWeight: 'bold',
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
  retryButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  batchSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearBatchText: {
    color: '#0066cc',
    fontSize: 12,
    fontWeight: '600',
  },
  batchFileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  batchSubtext: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    marginTop: 40,
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

