package com.rapid.features.upload.service;

import com.rapid.domain.Photo;
import com.rapid.domain.UploadBatch;
import com.rapid.features.upload.dto.BatchStatusResponse;
import com.rapid.features.upload.dto.PhotoStatusDto;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.repository.UploadBatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * QUERY SERVICE: Read-only operations for upload batch status
 * Part of CQRS pattern - no state changes, no side effects
 */
@Service
public class UploadQueryService {
    
    private static final Logger log = LoggerFactory.getLogger(UploadQueryService.class);
    
    @Autowired
    private UploadBatchRepository batchRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Transactional(readOnly = true)
    public BatchStatusResponse getBatchStatus(String userId, String batchId) {
        log.debug("Query batch status: userId={}, batchId={}", userId, batchId);
        
        UploadBatch batch = batchRepository.findByIdAndUserId(batchId, userId)
            .orElseThrow(() -> new RuntimeException("Batch not found"));
        
        List<Photo> photos = photoRepository.findByUserIdAndBatchIdOrderByCreatedAtDesc(userId, batchId);
        
        log.debug("Found batch: totalCount={}, completedCount={}, failedCount={}, photos={}", 
            batch.getTotalCount(), batch.getCompletedCount(), batch.getFailedCount(), photos.size());
        
        List<PhotoStatusDto> photoDtos = photos.stream()
            .map(p -> new PhotoStatusDto(
                p.getId(),
                p.getOriginalFilename(),
                p.getStatus(),
                p.getErrorMessage(),
                p.getUpdatedAt()
            ))
            .collect(Collectors.toList());
        
        return new BatchStatusResponse(
            batch.getId(),
            batch.getTotalCount(),
            batch.getCompletedCount(),
            batch.getFailedCount(),
            photoDtos
        );
    }
}

