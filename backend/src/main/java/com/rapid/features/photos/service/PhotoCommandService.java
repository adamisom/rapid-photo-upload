package com.rapid.features.photos.service;

import com.rapid.domain.Photo;
import com.rapid.features.photos.dto.UpdateTagsRequest;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.storage.S3PresignedUrlService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * COMMAND SERVICE: State-changing operations for photos
 * Part of CQRS pattern - handles update, delete operations
 */
@Service
public class PhotoCommandService {
    
    private static final Logger log = LoggerFactory.getLogger(PhotoCommandService.class);
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    @Transactional
    public void deletePhoto(String userId, String photoId) {
        log.info("Delete photo: userId={}, photoId={}", userId, photoId);
        
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Delete from S3
        s3Service.deleteFile(userId, photo.getS3Key());
        
        // Delete from database
        photoRepository.delete(photo);
        
        log.info("Photo deleted: photoId={}", photoId);
    }
    
    @Transactional
    public void updateTags(String userId, String photoId, UpdateTagsRequest request) {
        log.info("Update tags: userId={}, photoId={}, tagCount={}", userId, photoId, request.getTags().size());
        
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Validate: max 3 tags
        if (request.getTags().size() > 3) {
            throw new IllegalArgumentException("Maximum 3 tags allowed");
        }
        
        // Validate: each tag max 50 chars and not empty
        List<String> validatedTags = request.getTags().stream()
            .map(String::trim)
            .filter(tag -> !tag.isEmpty())
            .filter(tag -> tag.length() <= 50)
            .collect(Collectors.toList());
        
        if (validatedTags.size() > 3) {
            throw new IllegalArgumentException("Maximum 3 tags allowed");
        }
        
        photo.setTags(validatedTags);
        photoRepository.save(photo);
        
        log.info("Tags updated: photoId={}, tags={}", photoId, validatedTags);
    }
}

