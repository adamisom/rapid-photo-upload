package com.rapid.features.upload.dto;

import jakarta.validation.constraints.NotNull;

public class UploadCompleteRequest {
    
    @NotNull(message = "File size is required")
    private Long fileSizeBytes;
    
    private String eTag; // Optional ETag from S3 for verification
    
    public UploadCompleteRequest() {}
    
    public UploadCompleteRequest(Long fileSizeBytes, String eTag) {
        this.fileSizeBytes = fileSizeBytes;
        this.eTag = eTag;
    }
    
    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }
    
    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
    
    public String getETag() {
        return eTag;
    }
    
    public void setETag(String eTag) {
        this.eTag = eTag;
    }
}

