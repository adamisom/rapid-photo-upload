package com.rapid.features.photos.service;

import com.rapid.domain.Photo;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.storage.S3PresignedUrlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PhotoCommandService {
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    @Transactional
    public void deletePhoto(String userId, String photoId) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Delete from S3
        s3Service.deleteFile(userId, photo.getS3Key());
        
        // Delete from database
        photoRepository.delete(photo);
    }
}

