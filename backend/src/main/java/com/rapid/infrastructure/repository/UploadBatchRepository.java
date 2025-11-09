package com.rapid.infrastructure.repository;

import com.rapid.domain.UploadBatch;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface UploadBatchRepository extends JpaRepository<UploadBatch, String> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<UploadBatch> findByIdAndUserId(String id, String userId);
    
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("UPDATE UploadBatch b SET b.totalCount = b.totalCount + 1 WHERE b.id = :batchId")
    void incrementTotalCount(@Param("batchId") String batchId);
    
    /**
     * Atomically insert batch if not exists using PostgreSQL's ON CONFLICT.
     * This is the "correct" way to handle concurrent inserts with the same ID.
     * Returns 1 if inserted, 0 if already existed.
     */
    @Transactional
    @Modifying
    @Query(value = "INSERT INTO upload_batches (id, user_id, total_count, completed_count, failed_count, created_at, updated_at) " +
                   "VALUES (:id, :userId, 0, 0, 0, NOW(), NOW()) " +
                   "ON CONFLICT (id) DO NOTHING", 
           nativeQuery = true)
    int insertBatchIfNotExists(@Param("id") String id, @Param("userId") String userId);
}

