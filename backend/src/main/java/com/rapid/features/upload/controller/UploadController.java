package com.rapid.features.upload.controller;

import com.rapid.features.upload.dto.BatchCompleteRequest;
import com.rapid.features.upload.dto.BatchStatusResponse;
import com.rapid.features.upload.dto.InitiateUploadRequest;
import com.rapid.features.upload.dto.InitiateUploadResponse;
import com.rapid.features.upload.dto.UploadCompleteRequest;
import com.rapid.features.upload.service.UploadCommandService;
import com.rapid.features.upload.service.UploadQueryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class UploadController {
    
    @Autowired
    private UploadCommandService uploadCommandService;
    
    @Autowired
    private UploadQueryService uploadQueryService;
    
    @PostMapping("/initiate")
    public ResponseEntity<?> initiateUpload(@Valid @RequestBody InitiateUploadRequest request) {
        String userId = getCurrentUserId();
        InitiateUploadResponse response = uploadCommandService.initiateUpload(userId, request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/complete/{photoId}")
    public ResponseEntity<?> completeUpload(
            @PathVariable String photoId,
            @Valid @RequestBody UploadCompleteRequest request) {
        String userId = getCurrentUserId();
        uploadCommandService.completeUpload(userId, photoId, request);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
    
    @PostMapping("/complete/batch")
    public ResponseEntity<?> batchCompleteUpload(
            @Valid @RequestBody BatchCompleteRequest request) {
        String userId = getCurrentUserId();
        int processedCount = uploadCommandService.batchCompleteUpload(userId, request);
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "processed", processedCount,
            "total", request.getItems().size()
        ));
    }
    
    @PostMapping("/failed/{photoId}")
    public ResponseEntity<?> failUpload(
            @PathVariable String photoId,
            @RequestBody Map<String, String> request) {
        String userId = getCurrentUserId();
        String errorMessage = request.getOrDefault("errorMessage", "Unknown error");
        uploadCommandService.failUpload(userId, photoId, errorMessage);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
    
    @GetMapping("/batch/{batchId}/status")
    public ResponseEntity<?> getBatchStatus(@PathVariable String batchId) {
        String userId = getCurrentUserId();
        BatchStatusResponse response = uploadQueryService.getBatchStatus(userId, batchId);
        return ResponseEntity.ok(response);
    }
    
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        throw new RuntimeException("User not authenticated");
    }
}

