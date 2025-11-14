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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * COMMAND SERVICE: State-changing operations for uploads
 * Part of CQRS pattern - handles create, update, delete operations
 */
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
    
    @Autowired
    private LimitsService limitsService;
    
    @Transactional
    public InitiateUploadResponse initiateUpload(String userId, InitiateUploadRequest request) {
        log.info("Initiate upload: userId={}, batchId={}, filename={}, size={}", 
            userId, request.getBatchId(), request.getFilename(), request.getFileSizeBytes());
        
        // Check limits before processing upload
        limitsService.checkFileSizeLimit(request.getFileSizeBytes());
        limitsService.checkPhotoLimit();
        limitsService.checkStorageLimit();
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        // Create or fetch batch
        UploadBatch batch;
        if (request.getBatchId() != null && !request.getBatchId().isEmpty()) {
            log.debug("Using existing/creating batch: {}", request.getBatchId());
            
            // Atomically insert batch if not exists (PostgreSQL ON CONFLICT)
            // This is safe for concurrent requests - all will succeed
            uploadBatchRepository.insertBatchIfNotExists(request.getBatchId(), userId);
            
            // Now fetch it (guaranteed to exist)
            batch = uploadBatchRepository.findByIdAndUserId(request.getBatchId(), userId)
                .orElseThrow(() -> new RuntimeException("Batch not found after insert"));
        } else {
            log.debug("Creating new batch with auto-generated ID");
            // No batchId provided - create new batch with auto-generated ID
            batch = new UploadBatch();
            batch.setId(UUID.randomUUID().toString());
            batch.setUser(user);
            batch.setTotalCount(0);
            batch = uploadBatchRepository.saveAndFlush(batch);
            log.debug("Created batch: {}", batch.getId());
        }
        
        // Atomically increment total count using database-level update
        uploadBatchRepository.incrementTotalCount(batch.getId());
        
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
        
        // Generate presigned URL
        String presignedUrl = s3Service.generatePresignedPutUrl(userId, s3Key);
        
        log.info("Upload initiated: photoId={}, batchId={}", photo.getId(), batch.getId());
        
        return new InitiateUploadResponse(
            photo.getId(),
            presignedUrl,
            30,
            batch.getId()
        );
    }
    
    @Transactional
    public void completeUpload(String userId, String photoId, UploadCompleteRequest request) {
        log.info("Complete upload: userId={}, photoId={}, size={}", userId, photoId, request.getFileSizeBytes());
        
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        // Verify file exists in S3
        if (!s3Service.verifyFileExists(userId, photo.getS3Key())) {
            log.error("S3 verification failed: file not found - photoId={}, s3Key={}", photoId, photo.getS3Key());
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File not found in S3");
            photoRepository.save(photo);
            throw new RuntimeException("Upload verification failed");
        }
        
        // Verify file size
        long actualSize = s3Service.getFileSizeBytes(userId, photo.getS3Key());
        if (actualSize != request.getFileSizeBytes()) {
            log.error("Size mismatch: expected={}, actual={}, photoId={}", 
                request.getFileSizeBytes(), actualSize, photoId);
            photo.setStatus(PhotoStatus.FAILED);
            photo.setErrorMessage("File size mismatch");
            photoRepository.save(photo);
            throw new RuntimeException("File size verification failed");
        }
        
        // Update photo status
        photo.setStatus(PhotoStatus.UPLOADED);
        photoRepository.save(photo);
        
        // Update batch counts atomically
        UploadBatch batch = photo.getBatch();
        uploadBatchRepository.incrementCompletedCount(batch.getId());
        
        log.info("Upload completed: photoId={}, batchId={}", photoId, batch.getId());
    }
    
    @Transactional
    public void failUpload(String userId, String photoId, String errorMessage) {
        log.warn("Upload failed: userId={}, photoId={}, error={}", userId, photoId, errorMessage);
        
        Photo photo = photoRepository.findByIdAndUserId(photoId, userId)
            .orElseThrow(() -> new RuntimeException("Photo not found"));
        
        photo.setStatus(PhotoStatus.FAILED);
        photo.setErrorMessage(errorMessage);
        photoRepository.save(photo);
        
        UploadBatch batch = photo.getBatch();
        uploadBatchRepository.incrementFailedCount(batch.getId());
        
        log.debug("Batch updated: batchId={}", batch.getId());
    }
    
    /**
     * Batch complete uploads: Process multiple upload completions in one transaction
     * This is more efficient than calling completeUpload multiple times
     * 
     * @param userId User ID
     * @param request Batch complete request with list of items
     * @return Number of successfully processed items
     */
    @Transactional
    public int batchCompleteUpload(String userId, BatchCompleteRequest request) {
        log.info("Batch complete upload: userId={}, itemCount={}", userId, request.getItems().size());
        
        int successCount = 0;
        String batchId = null;
        
        for (BatchCompleteRequest.CompleteItem item : request.getItems()) {
            try {
                Photo photo = photoRepository.findByIdAndUserId(item.getPhotoId(), userId)
                    .orElseThrow(() -> new RuntimeException("Photo not found: " + item.getPhotoId()));
                
                // Skip if already completed (idempotency)
                if (photo.getStatus() == PhotoStatus.UPLOADED) {
                    log.debug("Photo already completed, skipping: photoId={}", item.getPhotoId());
                    successCount++;
                    if (batchId == null) {
                        batchId = photo.getBatch().getId();
                    }
                    continue;
                }
                
                // Verify file exists in S3
                if (!s3Service.verifyFileExists(userId, photo.getS3Key())) {
                    log.error("S3 verification failed: file not found - photoId={}, s3Key={}", 
                        item.getPhotoId(), photo.getS3Key());
                    photo.setStatus(PhotoStatus.FAILED);
                    photo.setErrorMessage("File not found in S3");
                    photoRepository.save(photo);
                    continue; // Skip this item, continue with others
                }
                
                // Verify file size
                long actualSize = s3Service.getFileSizeBytes(userId, photo.getS3Key());
                if (actualSize != item.getFileSizeBytes()) {
                    log.error("Size mismatch: expected={}, actual={}, photoId={}", 
                        item.getFileSizeBytes(), actualSize, item.getPhotoId());
                    photo.setStatus(PhotoStatus.FAILED);
                    photo.setErrorMessage("File size mismatch");
                    photoRepository.save(photo);
                    continue; // Skip this item, continue with others
                }
                
                // Update photo status
                photo.setStatus(PhotoStatus.UPLOADED);
                photoRepository.save(photo);
                
                // Track batch for count update
                if (batchId == null) {
                    batchId = photo.getBatch().getId();
                }
                
                successCount++;
                
            } catch (Exception e) {
                log.error("Error processing batch complete item: photoId={}, error={}", 
                    item.getPhotoId(), e.getMessage(), e);
                // Continue with next item (don't fail entire batch)
            }
        }
        
        // Update batch completed count atomically (single update for all successful items)
        if (batchId != null && successCount > 0) {
            uploadBatchRepository.incrementCompletedCountBy(batchId, successCount);
            log.info("Batch updated: batchId={}, addedCompletedCount={}", batchId, successCount);
        }
        
        log.info("Batch complete finished: userId={}, totalItems={}, successCount={}", 
            userId, request.getItems().size(), successCount);
        
        return successCount;
    }
}

