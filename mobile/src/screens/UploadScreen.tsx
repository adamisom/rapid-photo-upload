import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUpload } from '../hooks/useUpload';
import ProgressBar from '../components/ProgressBar';
import { formatFileSize, formatTimeRemaining, formatUploadTime } from '../utils/formatters';

export default function UploadScreen() {
  const [loading, setLoading] = useState(false);
  const [batchPage, setBatchPage] = useState(0);
  const batchesPerPage = 5;
  const [batchFilePages, setBatchFilePages] = useState<{ [key: string]: number }>({});
  const filesPerPage = 50;
  const { 
    files, 
    completedBatches,
    isUploading,
    isPreparing,
    totalProgress,
    estimatedTimeRemaining,
    addFile, 
    removeFile,
    removeAll,
    retryFile,
    retryAllFailed,
    clearLastBatch,
    clearPreviousBatches,
    startUpload
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
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        result.assets.forEach((asset) => {
          // Extract filename from URI if not provided
          let filename = asset.fileName;
          if (!filename && asset.uri) {
            // Extract from URI: "file://.../ImagePicker/216B46A8.png" -> "216B46A8.png"
            const uriParts = asset.uri.split('/');
            const extractedFilename = uriParts[uriParts.length - 1];
            
            // If it's a UUID-style filename (long), truncate to first 8 chars + extension
            const nameParts = extractedFilename.split('.');
            const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
            const baseName = nameParts.join('.');
            
            if (baseName.length > 8 && baseName.includes('-')) {
              // Looks like a UUID, truncate
              filename = baseName.substring(0, 8) + extension;
            } else {
              filename = extractedFilename;
            }
          }
          if (!filename) {
            filename = `photo_${Date.now()}.jpg`;
          }
          
          console.log('📸 Selected photo:', {
            uri: asset.uri,
            originalFilename: asset.fileName,
            extractedFilename: filename,
            type: asset.type,
            fileSize: asset.fileSize,
            width: asset.width,
            height: asset.height,
          });
          
          // Infer MIME type from filename extension
          const extension = filename.toLowerCase().split('.').pop();
          let mimeType = 'image/jpeg'; // default
          if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else if (extension === 'webp') mimeType = 'image/webp';
          
          console.log('📤 Adding file:', { filename, mimeType, size: asset.fileSize });
          
          addFile({
            uri: asset.uri,
            name: filename,
            type: mimeType,
            size: asset.fileSize || 1000000,
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
      {(isUploading || isPreparing) && (
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            {isPreparing 
              ? `Preparing upload for ${files.length} file${files.length !== 1 ? 's' : ''}...`
              : `${files.filter(f => f.status === 'completed').length} of ${files.length} files uploaded`}
          </Text>
          {!isPreparing && (
            <>
              <Text style={styles.progressPercent}>{Math.round(totalProgress)}%</Text>
              {files.length >= 50 && (
                <Text style={styles.etaText}>
                  uploading in batches of 20
                </Text>
              )}
              <ProgressBar progress={totalProgress} />
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <Text style={styles.etaText}>
                  ~{formatTimeRemaining(estimatedTimeRemaining)} remaining
                </Text>
              )}
            </>
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
            data={[...files].sort((a, b) => {
              // Sort: uploading first, then pending, then completed, then failed
              const statusOrder = { uploading: 0, pending: 1, completed: 2, failed: 3 };
              return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            })}
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
          
          {/* Retry All Failed Button */}
          {!isUploading && files.filter(f => f.status === 'failed').length >= 2 && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#6B7280', marginTop: 8 }]}
              onPress={retryAllFailed}
            >
              <Text style={styles.buttonText}>Retry All Failed</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Last Batch */}
      {lastBatch && lastBatch.files && lastBatch.files.length > 0 && (() => {
        const batchId = lastBatch.id;
        const currentPage = batchFilePages[batchId] || 0;
        const totalFilePages = Math.ceil(lastBatch.files.length / filesPerPage);
        const startIndex = currentPage * filesPerPage;
        const endIndex = startIndex + filesPerPage;
        const paginatedFiles = lastBatch.files.slice(startIndex, endIndex);
        
        return (
          <View style={styles.batchSection}>
            <View style={styles.batchHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Last Batch</Text>
                {lastBatch.totalUploadTimeSeconds !== undefined && (
                  <Text style={styles.batchSubtext}>
                    Uploaded in {formatUploadTime(lastBatch.totalUploadTimeSeconds)}
                  </Text>
                )}
                {totalFilePages > 1 && (
                  <Text style={styles.batchSubtext}>
                    Files: Page {currentPage + 1} of {totalFilePages} • {lastBatch.files.length} total
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={clearLastBatch}>
                <Text style={styles.clearBatchText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={paginatedFiles}
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
            
            {/* File Pagination within Last Batch */}
            {totalFilePages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage === 0 && styles.paginationButtonDisabled]}
                  onPress={() => setBatchFilePages(prev => ({ ...prev, [batchId]: Math.max(0, currentPage - 1) }))}
                  disabled={currentPage === 0}
                >
                  <Text style={styles.paginationText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.paginationInfo}>
                  Page {currentPage + 1} of {totalFilePages}
                </Text>
                <TouchableOpacity
                  style={[styles.paginationButton, currentPage >= totalFilePages - 1 && styles.paginationButtonDisabled]}
                  onPress={() => setBatchFilePages(prev => ({ ...prev, [batchId]: Math.min(totalFilePages - 1, currentPage + 1) }))}
                  disabled={currentPage >= totalFilePages - 1}
                >
                  <Text style={styles.paginationText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}

      {/* Previous Batches */}
      {previousBatches.length > 0 && (() => {
        const totalBatchPages = Math.ceil(previousBatches.length / batchesPerPage);
        const startIndex = batchPage * batchesPerPage;
        const endIndex = startIndex + batchesPerPage;
        const paginatedBatches = previousBatches.slice(startIndex, endIndex);
        
        return (
          <View style={styles.previousBatchesContainer}>
            <View style={styles.batchHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  Previous Batches ({previousBatches.length})
                </Text>
                {totalBatchPages > 1 && (
                  <Text style={styles.batchSubtext}>
                    Page {batchPage + 1} of {totalBatchPages}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={clearPreviousBatches}>
                <Text style={styles.clearBatchText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            
            {paginatedBatches.map((batch, paginatedIndex) => {
              const originalIndex = startIndex + paginatedIndex;
              const batchId = batch.id;
              const currentFilePage = batchFilePages[batchId] || 0;
              const totalFilePages = Math.ceil(batch.files.length / filesPerPage);
              const fileStartIndex = currentFilePage * filesPerPage;
              const fileEndIndex = fileStartIndex + filesPerPage;
              const paginatedFiles = batch.files.slice(fileStartIndex, fileEndIndex);
              
              return (
            <View key={batch.id} style={styles.batchSection}>
              <Text style={styles.batchSubtext}>
                Batch {previousBatches.length - originalIndex} • {batch.files.length} file{batch.files.length !== 1 ? 's' : ''}
                {batch.totalUploadTimeSeconds !== undefined && ` • ${formatUploadTime(batch.totalUploadTimeSeconds)}`}
                {totalFilePages > 1 && ` • Files: Page ${currentFilePage + 1}/${totalFilePages}`}
              </Text>
              <FlatList
                data={paginatedFiles}
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
              
              {/* File Pagination within Batch */}
              {totalFilePages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentFilePage === 0 && styles.paginationButtonDisabled]}
                    onPress={() => setBatchFilePages(prev => ({ ...prev, [batchId]: Math.max(0, currentFilePage - 1) }))}
                    disabled={currentFilePage === 0}
                  >
                    <Text style={styles.paginationText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.paginationInfo}>
                    Page {currentFilePage + 1} of {totalFilePages}
                  </Text>
                  <TouchableOpacity
                    style={[styles.paginationButton, currentFilePage >= totalFilePages - 1 && styles.paginationButtonDisabled]}
                    onPress={() => setBatchFilePages(prev => ({ ...prev, [batchId]: Math.min(totalFilePages - 1, currentFilePage + 1) }))}
                    disabled={currentFilePage >= totalFilePages - 1}
                  >
                    <Text style={styles.paginationText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            );
            })}
            
            {/* Batch Pagination */}
            {totalBatchPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.paginationButton, batchPage === 0 && styles.paginationButtonDisabled]}
                  onPress={() => setBatchPage(Math.max(0, batchPage - 1))}
                  disabled={batchPage === 0}
                >
                  <Text style={styles.paginationText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.paginationInfo}>
                  Page {batchPage + 1} of {totalBatchPages}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    batchPage >= totalBatchPages - 1 && styles.paginationButtonDisabled
                  ]}
                  onPress={() => setBatchPage(Math.min(totalBatchPages - 1, batchPage + 1))}
                  disabled={batchPage >= totalBatchPages - 1}
                >
                  <Text style={styles.paginationText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}

      {/* Empty State */}
      {files.length === 0 && !lastBatch && !isUploading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos selected</Text>
          <Text style={styles.emptySubtext}>Tap &quot;Select Photos&quot; to get started</Text>
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
    paddingTop: 60,
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
  previousBatchesContainer: {
    marginTop: 20,
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
    paddingVertical: 2,
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paginationButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  paginationButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  paginationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});

