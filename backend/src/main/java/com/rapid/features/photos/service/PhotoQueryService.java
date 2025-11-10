package com.rapid.features.photos.service;

import com.rapid.domain.Photo;
import com.rapid.domain.PhotoStatus;
import com.rapid.features.photos.dto.PhotoDto;
import com.rapid.features.photos.dto.PhotoListResponse;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.storage.S3PresignedUrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * QUERY SERVICE: Read-only operations for photos
 * 
 * Part of CQRS pattern - handles all read operations for photos.
 * Methods in this service:
 * - Never modify state
 * - Return DTOs (not domain entities)
 * - Generate presigned URLs for S3 access
 * - Filter by user ID for security
 * 
 * This separation from PhotoCommandService allows:
 * - Independent optimization of reads vs writes
 * - Clear separation of concerns
 * - Easier caching strategies (future enhancement)
 */
@Service
public class PhotoQueryService {
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    public PhotoListResponse getUserPhotos(String userId, int pageNumber, int pageSize) {
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
        Page<Photo> page = photoRepository.findByUserId(userId, pageable);
        
        List<PhotoDto> photoDtos = page.getContent().stream()
            .filter(p -> p.getStatus() == PhotoStatus.UPLOADED)
            .map(p -> new PhotoDto(
                p.getId(),
                p.getOriginalFilename(),
                p.getFileSizeBytes(),
                s3Service.generatePresignedGetUrl(userId, p.getS3Key()),
                p.getCreatedAt(),
                p.getTags()
            ))
            .collect(Collectors.toList());
        
        return new PhotoListResponse(
            photoDtos,
            pageNumber,
            pageSize,
            page.getTotalElements()
        );
    }
    
    public PhotoDto getPhotoById(String userId, String photoId) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        if (photo.getStatus() != PhotoStatus.UPLOADED) {
            throw new RuntimeException("Photo not available");
        }
        
        return new PhotoDto(
            photo.getId(),
            photo.getOriginalFilename(),
            photo.getFileSizeBytes(),
            s3Service.generatePresignedGetUrl(userId, photo.getS3Key()),
            photo.getCreatedAt(),
            photo.getTags()
        );
    }
}

