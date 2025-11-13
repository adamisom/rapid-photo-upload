package com.rapid.infrastructure.repository;

import com.rapid.domain.Photo;
import com.rapid.domain.PhotoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, String> {
    List<Photo> findByUserIdAndBatchIdOrderByCreatedAtDesc(String userId, String batchId);
    List<Photo> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    Page<Photo> findByUserId(String userId, Pageable pageable);
    Optional<Photo> findByIdAndUserId(String id, String userId);
    
    // Query method that filters by status in the database (fixes pagination bug)
    Page<Photo> findByUserIdAndStatus(String userId, PhotoStatus status, Pageable pageable);
    
    // Count method for UPLOADED photos only (for accurate pagination totals)
    long countByUserIdAndStatus(String userId, PhotoStatus status);
    
    @Query("SELECT SUM(p.fileSizeBytes) FROM Photo p")
    Long sumFileSizeBytes();
}

