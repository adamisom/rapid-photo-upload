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
}

