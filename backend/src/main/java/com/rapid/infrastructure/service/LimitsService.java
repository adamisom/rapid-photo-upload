package com.rapid.infrastructure.service;

import com.rapid.infrastructure.exceptions.LimitExceededException;
import com.rapid.infrastructure.repository.PhotoRepository;
import com.rapid.infrastructure.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for enforcing global limits to prevent runaway AWS costs
 * 
 * Limits:
 * - Max 50 users
 * - Max 10,000 photos
 * - Max 500 GB total storage (overall app total)
 * - Max 1.1 GB per file
 */
@Service
public class LimitsService {
    
    private static final int MAX_USERS = 50;
    private static final int MAX_PHOTOS = 10000;
    private static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024 * 1024; // 500 GB (overall app total)
    private static final long MAX_FILE_BYTES = 1100L * 1024 * 1024;  // 1.1 GB (1100 MB)
    
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    
    public LimitsService(UserRepository userRepository, PhotoRepository photoRepository) {
        this.userRepository = userRepository;
        this.photoRepository = photoRepository;
    }
    
    /**
     * Check if we can create a new user
     * @throws LimitExceededException if user limit reached
     */
    @Transactional(readOnly = true)
    public void checkUserLimit() {
        long userCount = userRepository.count();
        if (userCount >= MAX_USERS) {
            throw new LimitExceededException(
                "Can't register more users at this time",
                "USER_LIMIT"
            );
        }
    }
    
    /**
     * Check if we can upload a new photo
     * @throws LimitExceededException if photo limit reached
     */
    @Transactional(readOnly = true)
    public void checkPhotoLimit() {
        long photoCount = photoRepository.count();
        if (photoCount >= MAX_PHOTOS) {
            throw new LimitExceededException(
                "You've reached your image limit",
                "PHOTO_LIMIT"
            );
        }
    }
    
    /**
     * Check if we have storage capacity
     * @throws LimitExceededException if storage limit reached
     */
    @Transactional(readOnly = true)
    public void checkStorageLimit() {
        Long totalBytes = photoRepository.sumFileSizeBytes();
        if (totalBytes != null && totalBytes >= MAX_TOTAL_BYTES) {
            throw new LimitExceededException(
                "You've reached your image limit",
                "STORAGE_LIMIT"
            );
        }
    }
    
    /**
     * Check if individual file size is within limit
     * @param fileSizeBytes size of file to check
     * @throws LimitExceededException if file too large
     */
    public void checkFileSizeLimit(long fileSizeBytes) {
        if (fileSizeBytes > MAX_FILE_BYTES) {
            throw new LimitExceededException(
                "Image too large (max 1.1 GB)",
                "FILE_SIZE"
            );
        }
    }
}

