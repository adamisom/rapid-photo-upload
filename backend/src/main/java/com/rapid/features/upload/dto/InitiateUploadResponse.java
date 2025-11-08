package com.rapid.features.upload.dto;

public class InitiateUploadResponse {
    
    private String photoId;
    private String uploadUrl;
    private Integer expiresInMinutes;
    private String batchId;
    
    public InitiateUploadResponse() {}
    
    public InitiateUploadResponse(String photoId, String uploadUrl, Integer expiresInMinutes, String batchId) {
        this.photoId = photoId;
        this.uploadUrl = uploadUrl;
        this.expiresInMinutes = expiresInMinutes;
        this.batchId = batchId;
    }
    
    public String getPhotoId() {
        return photoId;
    }
    
    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }
    
    public String getUploadUrl() {
        return uploadUrl;
    }
    
    public void setUploadUrl(String uploadUrl) {
        this.uploadUrl = uploadUrl;
    }
    
    public Integer getExpiresInMinutes() {
        return expiresInMinutes;
    }
    
    public void setExpiresInMinutes(Integer expiresInMinutes) {
        this.expiresInMinutes = expiresInMinutes;
    }
    
    public String getBatchId() {
        return batchId;
    }
    
    public void setBatchId(String batchId) {
        this.batchId = batchId;
    }
}

