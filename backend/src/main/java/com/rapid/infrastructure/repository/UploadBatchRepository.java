package com.rapid.infrastructure.repository;

import com.rapid.domain.UploadBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UploadBatchRepository extends JpaRepository<UploadBatch, String> {
    Optional<UploadBatch> findByIdAndUserId(String id, String userId);
}

