package com.rapid.features.upload.service;

import com.rapid.domain.Photo;
import com.rapid.domain.PhotoStatus;
import com.rapid.domain.UploadBatch;
import com.rapid.domain.User;
import com.rapid.features.upload.dto.InitiateUploadRequest;
import com.rapid.features.upload.dto.InitiateUploadResponse;
import com.rapid.features.upload.dto.UploadCompleteRequest;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.repository.UploadBatchRepository;
import com.rapid.infrastructure.repository.UserRepository;
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
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.save(any(UploadBatch.class))).thenReturn(testBatch);
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        InitiateUploadResponse response = uploadCommandService.initiateUpload("user-123", request);

        assertNotNull(response);
        assertEquals("photo-123", response.getPhotoId());
        assertNotNull(response.getUploadUrl());
        assertEquals("batch-123", response.getBatchId());
        
        verify(uploadBatchRepository).save(any(UploadBatch.class));
        verify(photoRepository).save(any(Photo.class));
    }

    @Test
    void testInitiateUploadReusesExistingBatch() {
        InitiateUploadRequest request = new InitiateUploadRequest("test2.jpg", 2048L, "image/jpeg", "batch-123");
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.findByIdAndUserId("batch-123", "user-123")).thenReturn(Optional.of(testBatch));
        when(photoRepository.save(any(Photo.class))).thenReturn(testPhoto);
        when(s3Service.generatePresignedPutUrl(anyString(), anyString())).thenReturn("https://s3.url");

        InitiateUploadResponse response = uploadCommandService.initiateUpload("user-123", request);

        assertNotNull(response);
        assertEquals("batch-123", response.getBatchId());
        
        // Verify batch was retrieved but not created
        verify(uploadBatchRepository, never()).save(any(UploadBatch.class));
        verify(uploadBatchRepository).findByIdAndUserId("batch-123", "user-123");
    }

    @Test
    void testInitiateUploadGeneratesS3KeyWithUserId() {
        InitiateUploadRequest request = new InitiateUploadRequest("test.jpg", 1024L, "image/jpeg", null);
        
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(uploadBatchRepository.save(any(UploadBatch.class))).thenReturn(testBatch);
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
}

