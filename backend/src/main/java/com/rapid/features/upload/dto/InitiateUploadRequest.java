package com.rapid.features.upload.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class InitiateUploadRequest {
    
    @NotBlank(message = "Filename is required")
    private String filename;
    
    @NotNull(message = "File size is required")
    private Long fileSizeBytes;
    
    @NotBlank(message = "Content type is required")
    private String contentType;
    
    private String batchId; // Optional; backend creates if null
    
    public InitiateUploadRequest() {}
    
    public InitiateUploadRequest(String filename, Long fileSizeBytes, String contentType, String batchId) {
        this.filename = filename;
        this.fileSizeBytes = fileSizeBytes;
        this.contentType = contentType;
        this.batchId = batchId;
    }
    
    public String getFilename() {
        return filename;
    }
    
    public void setFilename(String filename) {
        this.filename = filename;
    }
    
    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }
    
    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
    
    public String getContentType() {
        return contentType;
    }
    
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    
    public String getBatchId() {
        return batchId;
    }
    
    public void setBatchId(String batchId) {
        this.batchId = batchId;
    }
}

