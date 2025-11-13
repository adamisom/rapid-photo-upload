package com.rapid.features.upload.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class BatchCompleteRequest {
    
    @NotEmpty(message = "Items list cannot be empty")
    @Valid
    private List<CompleteItem> items;
    
    public BatchCompleteRequest() {}
    
    public BatchCompleteRequest(List<CompleteItem> items) {
        this.items = items;
    }
    
    public List<CompleteItem> getItems() {
        return items;
    }
    
    public void setItems(List<CompleteItem> items) {
        this.items = items;
    }
    
    public static class CompleteItem {
        @NotNull(message = "Photo ID is required")
        private String photoId;
        
        @NotNull(message = "File size is required")
        private Long fileSizeBytes;
        
        private String eTag; // Optional ETag from S3
        
        public CompleteItem() {}
        
        public CompleteItem(String photoId, Long fileSizeBytes, String eTag) {
            this.photoId = photoId;
            this.fileSizeBytes = fileSizeBytes;
            this.eTag = eTag;
        }
        
        public String getPhotoId() {
            return photoId;
        }
        
        public void setPhotoId(String photoId) {
            this.photoId = photoId;
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
}

