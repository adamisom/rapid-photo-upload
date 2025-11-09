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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UploadCommandService {
    
    private static final Logger log = LoggerFactory.getLogger(UploadCommandService.class);
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UploadBatchRepository uploadBatchRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private S3PresignedUrlService s3Service;
    
    @Transactional
    public InitiateUploadResponse initiateUpload(String userId, InitiateUploadRequest request) {
        log.info("=== INITIATE UPLOAD START === userId={}, batchId={}, filename={}", 
            userId, request.getBatchId(), request.getFilename());
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Create or fetch batch
        UploadBatch batch;
        if (request.getBatchId() != null && !request.getBatchId().isEmpty()) {
            log.info("Looking for existing batch: {}", request.getBatchId());
            // Try to find existing batch, or create new one with client-provided ID
            batch = uploadBatchRepository.findByIdAndUserId(request.getBatchId(), userId)
                .orElseGet(() -> {
                    log.info("Batch not found, creating new batch with id: {}", request.getBatchId());
                    UploadBatch newBatch = new UploadBatch();
                    newBatch.setId(request.getBatchId()); // Use client-provided ID
                    newBatch.setUser(user);
                    newBatch.setTotalCount(0); // Will be incremented atomically
                    UploadBatch saved = uploadBatchRepository.save(newBatch);
                    log.info("Created new batch: {}", saved.getId());
                    return saved;
                });
            log.info("Using batch: {}, current totalCount: {}", batch.getId(), batch.getTotalCount());
        } else {
            log.info("No batchId provided, creating new batch");
            // No batchId provided - create new batch with auto-generated ID
            batch = new UploadBatch();
            batch.setUser(user);
            batch.setTotalCount(0); // Will be incremented atomically
            batch = uploadBatchRepository.save(batch);
            log.info("Created new batch: {}", batch.getId());
        }
        
        // Atomically increment total count using database-level update
        log.info("Incrementing totalCount for batch: {}", batch.getId());
        try {
            uploadBatchRepository.incrementTotalCount(batch.getId());
            log.info("Successfully incremented totalCount for batch: {}", batch.getId());
        } catch (Exception e) {
            log.error("FAILED to increment totalCount for batch: {}", batch.getId(), e);
            throw e;
        }
        
        // Generate S3 key BEFORE saving photo (s3_key is NOT NULL)
        String s3Key = userId + "/" + System.currentTimeMillis() + "_" + UUID.randomUUID() + "_" + request.getFilename();
        
        // Create Photo record with S3 key set
        Photo photo = new Photo();
        photo.setUser(user);
        photo.setBatch(batch);
        photo.setOriginalFilename(request.getFilename());
        photo.setFileSizeBytes(request.getFileSizeBytes());
        photo.setS3Key(s3Key);
        photo.setStatus(PhotoStatus.PENDING);
        photo = photoRepository.save(photo);
        log.info("Created photo: {}", photo.getId());
        
        // Generate presigned URL
        String presignedUrl = s3Service.generatePresignedPutUrl(userId, s3Key);
        
        log.info("=== INITIATE UPLOAD SUCCESS === photoId={}, batchId={}", photo.getId(), batch.getId());
        
        return new InitiateUploadResponse(
            photo.getId(),
            presignedUrl,
            30,
            batch.getId()
        );
    }
    
    @Transactional
    public void completeUpload(String userId, String photoId, UploadCompleteRequest request) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Verify file exists in S3
        if (!s3Service.verifyFileExists(userId, photo.getS3Key())) {
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File not found in S3");
            photoRepository.save(photo);
            throw new RuntimeException("Upload verification failed");
        }
        
        // Verify file size
        long actualSize = s3Service.getFileSizeBytes(userId, photo.getS3Key());
        if (actualSize != request.getFileSizeBytes()) {
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File size mismatch");
            photoRepository.save(photo);
            throw new RuntimeException("File size verification failed");
        }
        
        // Update photo status
        photo.setStatus(PhotoStatus.UPLOADED);
        photoRepository.save(photo);
        
        // Update batch counts
        UploadBatch batch = photo.getBatch();
        batch.setCompletedCount(batch.getCompletedCount() + 1);
        uploadBatchRepository.save(batch);
    }
    
    @Transactional
    public void failUpload(String userId, String photoId, String errorMessage) {
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        photo.setStatus(PhotoStatus.FAILED);
        photo.setErrorMessage(errorMessage);
        photoRepository.save(photo);
        
        UploadBatch batch = photo.getBatch();
        batch.setFailedCount(batch.getFailedCount() + 1);
        uploadBatchRepository.save(batch);
    }
}

