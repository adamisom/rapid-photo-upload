package com.rapid.features.photos.service;

import com.rapid.domain.Photo;
import com.rapid.domain.PhotoStatus;
import com.rapid.domain.User;
import com.rapid.features.photos.dto.PhotoDto;
import com.rapid.features.photos.dto.PhotoListResponse;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.storage.S3PresignedUrlService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhotoQueryServiceTest {

    @Mock
    private PhotoRepository photoRepository;

    @Mock
    private S3PresignedUrlService s3Service;

    @InjectMocks
    private PhotoQueryService photoQueryService;

    private User testUser;
    private List<Photo> uploadedPhotos;
    private List<Photo> pendingPhotos;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");

        // Create uploaded photos (should be included in pagination)
        uploadedPhotos = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Photo photo = new Photo();
            photo.setId("photo-uploaded-" + i);
            photo.setUser(testUser);
            photo.setOriginalFilename("uploaded-" + i + ".jpg");
            photo.setFileSizeBytes(1024L * i);
            photo.setS3Key("user-123/key" + i + ".jpg");
            photo.setStatus(PhotoStatus.UPLOADED);
            photo.setCreatedAt(LocalDateTime.now().minusHours(i));
            uploadedPhotos.add(photo);
        }

        // Create pending photos (should NOT be included in pagination)
        pendingPhotos = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            Photo photo = new Photo();
            photo.setId("photo-pending-" + i);
            photo.setUser(testUser);
            photo.setOriginalFilename("pending-" + i + ".jpg");
            photo.setFileSizeBytes(1024L * i);
            photo.setS3Key("user-123/pending" + i + ".jpg");
            photo.setStatus(PhotoStatus.PENDING);
            photo.setCreatedAt(LocalDateTime.now().minusMinutes(i));
            pendingPhotos.add(photo);
        }
    }

    @Test
    void testGetUserPhotosFiltersByUploadedStatus() {
        // Setup: Page with only UPLOADED photos (pagination fix)
        Pageable pageable = PageRequest.of(0, 20);
        Page<Photo> uploadedPage = new PageImpl<>(uploadedPhotos, pageable, uploadedPhotos.size());

        when(photoRepository.findByUserIdAndStatus(eq("user-123"), eq(PhotoStatus.UPLOADED), any(Pageable.class)))
            .thenReturn(uploadedPage);
        when(s3Service.generatePresignedGetUrl(anyString(), anyString()))
            .thenReturn("https://s3.url/presigned");

        PhotoListResponse response = photoQueryService.getUserPhotos("user-123", 0, 20);

        assertNotNull(response);
        assertEquals(5, response.getPhotos().size());
        assertEquals(5, response.getTotalCount()); // Should only count UPLOADED photos
        
        // Verify repository was called with status filter
        verify(photoRepository).findByUserIdAndStatus(eq("user-123"), eq(PhotoStatus.UPLOADED), any(Pageable.class));
        verify(photoRepository, never()).findByUserId(eq("user-123"), any(Pageable.class));
    }

    @Test
    void testGetUserPhotosExcludesPendingPhotos() {
        // This test verifies the pagination bug fix:
        // Before fix: Would query all photos, then filter, causing wrong totalCount
        // After fix: Queries only UPLOADED photos, totalCount is accurate

        Pageable pageable = PageRequest.of(0, 20);
        Page<Photo> uploadedPage = new PageImpl<>(uploadedPhotos, pageable, uploadedPhotos.size());

        when(photoRepository.findByUserIdAndStatus(eq("user-123"), eq(PhotoStatus.UPLOADED), any(Pageable.class)))
            .thenReturn(uploadedPage);
        when(s3Service.generatePresignedGetUrl(anyString(), anyString()))
            .thenReturn("https://s3.url/presigned");

        PhotoListResponse response = photoQueryService.getUserPhotos("user-123", 0, 20);

        // Total count should be 5 (only UPLOADED), not 8 (UPLOADED + PENDING)
        assertEquals(5, response.getTotalCount(), 
            "Total count should only include UPLOADED photos, not PENDING ones");
        assertEquals(5, response.getPhotos().size());
        
        // Verify all returned photos are UPLOADED
        response.getPhotos().forEach(photo -> {
            // All should be from uploadedPhotos list
            assertTrue(uploadedPhotos.stream().anyMatch(p -> p.getId().equals(photo.getId())),
                "All returned photos should be UPLOADED status");
        });
    }

    @Test
    void testGetUserPhotosExcludesFailedPhotos() {
        // Create failed photos
        List<Photo> failedPhotos = new ArrayList<>();
        Photo failedPhoto = new Photo();
        failedPhoto.setId("photo-failed-1");
        failedPhoto.setUser(testUser);
        failedPhoto.setStatus(PhotoStatus.FAILED);
        failedPhotos.add(failedPhoto);

        Pageable pageable = PageRequest.of(0, 20);
        Page<Photo> uploadedPage = new PageImpl<>(uploadedPhotos, pageable, uploadedPhotos.size());

        when(photoRepository.findByUserIdAndStatus(eq("user-123"), eq(PhotoStatus.UPLOADED), any(Pageable.class)))
            .thenReturn(uploadedPage);
        when(s3Service.generatePresignedGetUrl(anyString(), anyString()))
            .thenReturn("https://s3.url/presigned");

        PhotoListResponse response = photoQueryService.getUserPhotos("user-123", 0, 20);

        // Should not include failed photos
        assertEquals(5, response.getTotalCount());
        assertFalse(response.getPhotos().stream().anyMatch(p -> p.getId().equals("photo-failed-1")));
    }

    @Test
    void testGetUserPhotosPaginationAccuracy() {
        // Test pagination with mixed status photos
        // User has: 5 UPLOADED, 3 PENDING, 2 FAILED = 10 total
        // But pagination should show: 5 UPLOADED only

        Pageable pageable = PageRequest.of(0, 3); // Page size 3
        Page<Photo> firstPage = new PageImpl<>(
            uploadedPhotos.subList(0, 3), 
            pageable, 
            uploadedPhotos.size() // Total = 5 (only UPLOADED)
        );

        when(photoRepository.findByUserIdAndStatus(eq("user-123"), eq(PhotoStatus.UPLOADED), any(Pageable.class)))
            .thenReturn(firstPage);
        when(s3Service.generatePresignedGetUrl(anyString(), anyString()))
            .thenReturn("https://s3.url/presigned");

        PhotoListResponse response = photoQueryService.getUserPhotos("user-123", 0, 3);

        assertEquals(3, response.getPhotos().size()); // Page size
        assertEquals(5, response.getTotalCount()); // Total UPLOADED photos
        assertEquals(0, response.getPageNumber());
        assertEquals(3, response.getPageSize());
        
        // Total pages should be ceil(5/3) = 2
        int expectedTotalPages = (int) Math.ceil((double) response.getTotalCount() / response.getPageSize());
        assertEquals(2, expectedTotalPages);
    }

    @Test
    void testGetPhotoByIdThrowsWhenStatusNotUploaded() {
        Photo pendingPhoto = pendingPhotos.get(0);
        
        when(photoRepository.findByIdAndUserId("photo-pending-1", "user-123"))
            .thenReturn(java.util.Optional.of(pendingPhoto));

        assertThrows(RuntimeException.class, () ->
            photoQueryService.getPhotoById("user-123", "photo-pending-1"),
            "Should throw when photo status is not UPLOADED"
        );
    }

    @Test
    void testGetPhotoByIdReturnsDtoForUploadedPhoto() {
        Photo uploadedPhoto = uploadedPhotos.get(0);
        
        when(photoRepository.findByIdAndUserId("photo-uploaded-1", "user-123"))
            .thenReturn(java.util.Optional.of(uploadedPhoto));
        when(s3Service.generatePresignedGetUrl("user-123", uploadedPhoto.getS3Key()))
            .thenReturn("https://s3.url/presigned");

        PhotoDto dto = photoQueryService.getPhotoById("user-123", "photo-uploaded-1");

        assertNotNull(dto);
        assertEquals("photo-uploaded-1", dto.getId());
        assertEquals("uploaded-1.jpg", dto.getOriginalFilename());
        assertEquals(1024L, dto.getFileSizeBytes());
        assertNotNull(dto.getDownloadUrl());
    }
}

