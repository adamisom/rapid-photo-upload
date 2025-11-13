package com.rapid.features.upload.service;

import com.rapid.domain.Photo;
import com.rapid.domain.PhotoStatus;
import com.rapid.domain.UploadBatch;
import com.rapid.domain.User;
import com.rapid.features.upload.dto.BatchCompleteRequest;
import com.rapid.features.upload.dto.InitiateUploadRequest;
import com.rapid.features.upload.dto.InitiateUploadResponse;
import com.rapid.features.upload.dto.UploadCompleteRequest;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.repository.UploadBatchRepository;
import com.rapid.infrastructure.repository.UserRepository;
import com.rapid.infrastructure.service.LimitsService;
import com.rapid.infrastructure.storage.S3PresignedUrlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UploadCommandServiceTest {

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private UploadBatchRepository uploadBatchRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private S3PresignedUrlService s3Service;

    @Mock
    private LimitsService limitsService;

    @InjectMocks
    private UploadCommandService uploadCommandService;

    private User testUser;
    private UploadBatch testBatch;
    private Photo testPhoto;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");

        testBatch = new UploadBatch();
        testBatch.setId("batch-123");
        testBatch.setUser(testUser);
        testBatch.setTotalCount(1);
        testBatch.setCompletedCount(0);
        testBatch.setFailedCount(0);

        testPhoto = new Photo();
        testPhoto.setId("photo-123");
        testPhoto.setUser(testUser);
        testPhoto.setBatch(testBatch);
        testPhoto.setOriginalFilename("test.jpg");
        testPhoto.setFileSizeBytes(1024L);
        testPhoto.setS3Key("user-123/1234567890_uuid_test.jpg");
        testPhoto.setStatus(PhotoStatus.PENDING);
    }

    @Test
    void testInitiateUploadCreatesNewBatch() {
        InitiateUploadRequest request = new InitiateUploadRequest("test.jpg", 1024L, "image/jpeg", null);
        
        // Mock limits service (doesn't throw = passes)
        doNothing().when(limitsService).checkFileSizeLimit(anyLong());
        doNothing().when(limitsService).checkPhotoLimit();
        doNothing().when(limitsService).checkStorageLimit();
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.saveAndFlush(any(UploadBatch.class))).thenReturn(testBatch);
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        InitiateUploadResponse response = uploadCommandService.initiateUpload("user-123", request);

        assertNotNull(response);
        assertEquals("photo-123", response.getPhotoId());
        assertNotNull(response.getUploadUrl());
        assertEquals("batch-123", response.getBatchId());
        
        // Now uses saveAndFlush, then atomic increment
        verify(uploadBatchRepository).saveAndFlush(any(UploadBatch.class));
        verify(uploadBatchRepository).incrementTotalCount(anyString());
        verify(photoRepository).save(any(Photo.class));
    }

    @Test
    void testInitiateUploadReusesExistingBatch() {
        InitiateUploadRequest request = new InitiateUploadRequest("test2.jpg", 2048L, "image/jpeg", "batch-123");
        
        doNothing().when(limitsService).checkFileSizeLimit(anyLong());
        doNothing().when(limitsService).checkPhotoLimit();
        doNothing().when(limitsService).checkStorageLimit();
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.findByIdAndUserId("batch-123", "user-123")).thenReturn(Optional.of(testBatch));
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        InitiateUploadResponse response = uploadCommandService.initiateUpload("user-123", request);

        assertNotNull(response);
        assertEquals("batch-123", response.getBatchId());
        
        // Verify batch was retrieved and then atomically incremented
        verify(uploadBatchRepository).findByIdAndUserId("batch-123", "user-123");
        verify(uploadBatchRepository).incrementTotalCount("batch-123");
        verify(uploadBatchRepository, never()).save(any(UploadBatch.class));
    }

    @Test
    void testInitiateUploadGeneratesS3KeyWithUserId() {
        InitiateUploadRequest request = new InitiateUploadRequest("test.jpg", 1024L, "image/jpeg", null);
        
        doNothing().when(limitsService).checkFileSizeLimit(anyLong());
        doNothing().when(limitsService).checkPhotoLimit();
        doNothing().when(limitsService).checkStorageLimit();
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.saveAndFlush(any(UploadBatch.class))).thenReturn(testBatch);
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        uploadCommandService.initiateUpload("user-123", request);

        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(photoCaptor.capture());
        
        String s3Key = photoCaptor.getValue().getS3Key();
        assertTrue(s3Key.startsWith("user-123/"), "S3 key must start with userId");
        assertTrue(s3Key.contains("test.jpg"), "S3 key must contain filename");
    }

    @Test
    void testInitiateUploadWithClientProvidedBatchIdCreatesNewBatch() {
        // Test the new behavior where client provides a batchId that doesn't exist yet
        InitiateUploadRequest request = new InitiateUploadRequest("test.jpg", 1024L, "image/jpeg", "client-batch-456");
        
        doNothing().when(limitsService).checkFileSizeLimit(anyLong());
        doNothing().when(limitsService).checkPhotoLimit();
        doNothing().when(limitsService).checkStorageLimit();
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        // Mock the atomic insert operation (returns 1 row affected)
        when(uploadBatchRepository.insertBatchIfNotExists("client-batch-456", "user-123")).thenReturn(1);
        // After insert, batch should be found
        when(uploadBatchRepository.findByIdAndUserId("client-batch-456", "user-123")).thenReturn(Optional.of(testBatch));
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        InitiateUploadResponse response = uploadCommandService.initiateUpload("user-123", request);

        assertNotNull(response);
        assertEquals("batch-123", response.getBatchId());
        
        // Verify atomic insert was called, then batch was fetched
        verify(uploadBatchRepository).insertBatchIfNotExists("client-batch-456", "user-123");
        verify(uploadBatchRepository).findByIdAndUserId("client-batch-456", "user-123");
        verify(uploadBatchRepository).incrementTotalCount(anyString());
    }

    @Test
    void testCompleteUploadThrowsWhenFileNotInS3() {
        UploadCompleteRequest request = new UploadCompleteRequest(1024L, null);
        
        when(photoRepository.findByIdAndUserId("photo-123", "user-123")).thenReturn(Optional.of(testPhoto));
        when(s3Service.verifyFileExists("user-123", testPhoto.getS3Key())).thenReturn(false);

        assertThrows(RuntimeException.class, () ->
            uploadCommandService.completeUpload("user-123", "photo-123", request)
        );

        // Verify photo was marked as FAILED with error message
        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(photoCaptor.capture());
        assertEquals(PhotoStatus.FAILED, photoCaptor.getValue().getStatus());
        assertEquals("File not found in S3", photoCaptor.getValue().getErrorMessage());
    }

    @Test
    void testCompleteUploadThrowsOnFileSizeMismatch() {
        UploadCompleteRequest request = new UploadCompleteRequest(2048L, null); // Different size
        
        when(photoRepository.findByIdAndUserId("photo-123", "user-123")).thenReturn(Optional.of(testPhoto));
        when(s3Service.verifyFileExists("user-123", testPhoto.getS3Key())).thenReturn(true);
        when(s3Service.getFileSizeBytes("user-123", testPhoto.getS3Key())).thenReturn(1024L); // Actual size

        assertThrows(RuntimeException.class, () ->
            uploadCommandService.completeUpload("user-123", "photo-123", request)
        );

        // Verify photo was marked as FAILED with correct error
        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository, atLeast(1)).save(photoCaptor.capture());
        assertEquals(PhotoStatus.FAILED, photoCaptor.getValue().getStatus());
        assertEquals("File size mismatch", photoCaptor.getValue().getErrorMessage());
    }

    @Test
    void testCompleteUploadIncrementsBatchCompletedCount() {
        UploadCompleteRequest request = new UploadCompleteRequest(1024L, null);
        testBatch.setCompletedCount(5);
        testPhoto.setStatus(PhotoStatus.PENDING);
        
        when(photoRepository.findByIdAndUserId("photo-123", "user-123")).thenReturn(Optional.of(testPhoto));
        when(s3Service.verifyFileExists("user-123", testPhoto.getS3Key())).thenReturn(true);
        when(s3Service.getFileSizeBytes("user-123", testPhoto.getS3Key())).thenReturn(1024L);

        uploadCommandService.completeUpload("user-123", "photo-123", request);

        // Verify batch count was incremented
        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository).save(photoCaptor.capture());
        assertEquals(PhotoStatus.UPLOADED, photoCaptor.getValue().getStatus());
        
        ArgumentCaptor<UploadBatch> batchCaptor = ArgumentCaptor.forClass(UploadBatch.class);
        verify(uploadBatchRepository).save(batchCaptor.capture());
        assertEquals(6, batchCaptor.getValue().getCompletedCount());
    }

    @Test
    void testBatchCompleteUploadProcessesMultipleItems() {
        // Create multiple photos for batch processing
        Photo photo1 = new Photo();
        photo1.setId("photo-1");
        photo1.setUser(testUser);
        photo1.setBatch(testBatch);
        photo1.setS3Key("user-123/key1.jpg");
        photo1.setStatus(PhotoStatus.PENDING);

        Photo photo2 = new Photo();
        photo2.setId("photo-2");
        photo2.setUser(testUser);
        photo2.setBatch(testBatch);
        photo2.setS3Key("user-123/key2.jpg");
        photo2.setStatus(PhotoStatus.PENDING);

        BatchCompleteRequest request = new BatchCompleteRequest();
        request.setItems(java.util.Arrays.asList(
            new BatchCompleteRequest.CompleteItem("photo-1", 1024L, null),
            new BatchCompleteRequest.CompleteItem("photo-2", 2048L, null)
        ));

        when(photoRepository.findByIdAndUserId("photo-1", "user-123")).thenReturn(Optional.of(photo1));
        when(photoRepository.findByIdAndUserId("photo-2", "user-123")).thenReturn(Optional.of(photo2));
        when(s3Service.verifyFileExists("user-123", "user-123/key1.jpg")).thenReturn(true);
        when(s3Service.verifyFileExists("user-123", "user-123/key2.jpg")).thenReturn(true);
        when(s3Service.getFileSizeBytes("user-123", "user-123/key1.jpg")).thenReturn(1024L);
        when(s3Service.getFileSizeBytes("user-123", "user-123/key2.jpg")).thenReturn(2048L);
        when(uploadBatchRepository.findByIdAndUserId("batch-123", "user-123")).thenReturn(Optional.of(testBatch));

        int processedCount = uploadCommandService.batchCompleteUpload("user-123", request);

        assertEquals(2, processedCount);
        
        // Verify both photos were updated
        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository, times(2)).save(photoCaptor.capture());
        
        java.util.List<Photo> savedPhotos = photoCaptor.getAllValues();
        assertEquals(PhotoStatus.UPLOADED, savedPhotos.get(0).getStatus());
        assertEquals(PhotoStatus.UPLOADED, savedPhotos.get(1).getStatus());
        
        // Verify batch count was updated
        ArgumentCaptor<UploadBatch> batchCaptor = ArgumentCaptor.forClass(UploadBatch.class);
        verify(uploadBatchRepository).save(batchCaptor.capture());
        assertEquals(2, batchCaptor.getValue().getCompletedCount());
    }

    @Test
    void testBatchCompleteUploadHandlesPartialFailures() {
        Photo photo1 = new Photo();
        photo1.setId("photo-1");
        photo1.setUser(testUser);
        photo1.setBatch(testBatch);
        photo1.setS3Key("user-123/key1.jpg");
        photo1.setStatus(PhotoStatus.PENDING);

        Photo photo2 = new Photo();
        photo2.setId("photo-2");
        photo2.setUser(testUser);
        photo2.setBatch(testBatch);
        photo2.setS3Key("user-123/key2.jpg");
        photo2.setStatus(PhotoStatus.PENDING);

        BatchCompleteRequest request = new BatchCompleteRequest();
        request.setItems(java.util.Arrays.asList(
            new BatchCompleteRequest.CompleteItem("photo-1", 1024L, null),
            new BatchCompleteRequest.CompleteItem("photo-2", 2048L, null)
        ));

        when(photoRepository.findByIdAndUserId("photo-1", "user-123")).thenReturn(Optional.of(photo1));
        when(photoRepository.findByIdAndUserId("photo-2", "user-123")).thenReturn(Optional.of(photo2));
        when(s3Service.verifyFileExists("user-123", "user-123/key1.jpg")).thenReturn(true);
        when(s3Service.verifyFileExists("user-123", "user-123/key2.jpg")).thenReturn(false); // File 2 not found
        when(s3Service.getFileSizeBytes("user-123", "user-123/key1.jpg")).thenReturn(1024L);
        when(uploadBatchRepository.findByIdAndUserId("batch-123", "user-123")).thenReturn(Optional.of(testBatch));

        int processedCount = uploadCommandService.batchCompleteUpload("user-123", request);

        assertEquals(1, processedCount); // Only photo1 succeeded
        
        // Verify photo1 was updated to UPLOADED
        ArgumentCaptor<Photo> photoCaptor = ArgumentCaptor.forClass(Photo.class);
        verify(photoRepository, times(2)).save(photoCaptor.capture());
        
        java.util.List<Photo> savedPhotos = photoCaptor.getAllValues();
        // First save: photo1 to UPLOADED
        // Second save: photo2 to FAILED
        boolean foundUploaded = savedPhotos.stream().anyMatch(p -> 
            p.getId().equals("photo-1") && p.getStatus() == PhotoStatus.UPLOADED
        );
        boolean foundFailed = savedPhotos.stream().anyMatch(p -> 
            p.getId().equals("photo-2") && p.getStatus() == PhotoStatus.FAILED
        );
        assertTrue(foundUploaded, "Photo1 should be UPLOADED");
        assertTrue(foundFailed, "Photo2 should be FAILED");
    }

    @Test
    void testBatchCompleteUploadIsIdempotent() {
        // Test that completing an already-completed photo doesn't cause issues
        testPhoto.setStatus(PhotoStatus.UPLOADED); // Already completed

        BatchCompleteRequest request = new BatchCompleteRequest();
        request.setItems(java.util.Arrays.asList(
            new BatchCompleteRequest.CompleteItem("photo-123", 1024L, null)
        ));

        when(photoRepository.findByIdAndUserId("photo-123", "user-123")).thenReturn(Optional.of(testPhoto));
        when(uploadBatchRepository.findByIdAndUserId("batch-123", "user-123")).thenReturn(Optional.of(testBatch));

        int processedCount = uploadCommandService.batchCompleteUpload("user-123", request);

        assertEquals(1, processedCount); // Counted as processed (idempotent)
        
        // Should not verify S3 or update photo (already completed)
        verify(s3Service, never()).verifyFileExists(anyString(), anyString());
        verify(photoRepository, never()).save(any(Photo.class));
    }
}

