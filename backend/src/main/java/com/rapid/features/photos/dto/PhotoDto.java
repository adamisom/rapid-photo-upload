package com.rapid.features.photos.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PhotoDto {
    
    private String id;
    private String originalFilename;
    private Long fileSizeBytes;
    private String downloadUrl;
    private LocalDateTime uploadedAt;
    private List<String> tags;
    
    public PhotoDto() {}
    
    public PhotoDto(String id, String originalFilename, Long fileSizeBytes, String downloadUrl, LocalDateTime uploadedAt, List<String> tags) {
        this.id = id;
        this.originalFilename = originalFilename;
        this.fileSizeBytes = fileSizeBytes;
        this.downloadUrl = downloadUrl;
        this.uploadedAt = uploadedAt;
        this.tags = tags;
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
    
    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }
    
    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }
    
    public String getDownloadUrl() {
        return downloadUrl;
    }
    
    public void setDownloadUrl(String downloadUrl) {
        this.downloadUrl = downloadUrl;
    }
    
    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
    
    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }
}

