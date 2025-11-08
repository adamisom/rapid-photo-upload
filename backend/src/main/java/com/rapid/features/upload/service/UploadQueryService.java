package com.rapid.features.upload.service;

import com.rapid.domain.Photo;
import com.rapid.domain.UploadBatch;
import com.rapid.features.upload.dto.BatchStatusResponse;
import com.rapid.features.upload.dto.PhotoStatusDto;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.repository.UploadBatchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UploadQueryService {
    
    @Autowired
    private UploadBatchRepository batchRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    public BatchStatusResponse getBatchStatus(String userId, String batchId) {
        UploadBatch batch = batchRepository.findByIdAndUserId(batchId, userId)
            .orElseThrow(() -> new RuntimeException("Batch not found"));
        
        List<Photo> photos = photoRepository.findByUserIdAndBatchIdOrderByCreatedAtDesc(userId, batchId);
        
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

