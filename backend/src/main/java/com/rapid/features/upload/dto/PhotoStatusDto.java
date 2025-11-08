package com.rapid.features.upload.dto;

import com.rapid.domain.PhotoStatus;
import java.time.LocalDateTime;

public class PhotoStatusDto {
    
    private String id;
    private String originalFilename;
    private PhotoStatus status;
    private String errorMessage;
    private LocalDateTime updatedAt;
    
    public PhotoStatusDto() {}
    
    public PhotoStatusDto(String id, String originalFilename, PhotoStatus status, String errorMessage, LocalDateTime updatedAt) {
        this.id = id;
        this.originalFilename = originalFilename;
        this.status = status;
        this.errorMessage = errorMessage;
        this.updatedAt = updatedAt;
    }
    
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getOriginalFilename() {
        return originalFilename;
    }
    
    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }
    
    public PhotoStatus getStatus() {
        return status;
    }
    
    public void setStatus(PhotoStatus status) {
        this.status = status;
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

