package com.rapid.features.upload.dto;

import java.util.List;

public class BatchStatusResponse {
    
    private String batchId;
    private Integer totalCount;
    private Integer completedCount;
    private Integer failedCount;
    private List<PhotoStatusDto> photos;
    
    public BatchStatusResponse() {}
    
    public BatchStatusResponse(String batchId, Integer totalCount, Integer completedCount, Integer failedCount, List<PhotoStatusDto> photos) {
        this.batchId = batchId;
        this.totalCount = totalCount;
        this.completedCount = completedCount;
        this.failedCount = failedCount;
        this.photos = photos;
    }
    
    public String getBatchId() {
        return batchId;
    }
    
    public void setBatchId(String batchId) {
        this.batchId = batchId;
    }
    
    public Integer getTotalCount() {
        return totalCount;
    }
    
    public void setTotalCount(Integer totalCount) {
        this.totalCount = totalCount;
    }
    
    public Integer getCompletedCount() {
        return completedCount;
    }
    
    public void setCompletedCount(Integer completedCount) {
        this.completedCount = completedCount;
    }
    
    public Integer getFailedCount() {
        return failedCount;
    }
    
    public void setFailedCount(Integer failedCount) {
        this.failedCount = failedCount;
    }
    
    public List<PhotoStatusDto> getPhotos() {
        return photos;
    }
    
    public void setPhotos(List<PhotoStatusDto> photos) {
        this.photos = photos;
    }
}

