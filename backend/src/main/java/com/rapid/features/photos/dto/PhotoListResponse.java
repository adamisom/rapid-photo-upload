package com.rapid.features.photos.dto;

import java.util.List;

public class PhotoListResponse {
    
    private List<PhotoDto> photos;
    private Integer pageNumber;
    private Integer pageSize;
    private Long totalCount;
    
    public PhotoListResponse() {}
    
    public PhotoListResponse(List<PhotoDto> photos, Integer pageNumber, Integer pageSize, Long totalCount) {
        this.photos = photos;
        this.pageNumber = pageNumber;
        this.pageSize = pageSize;
        this.totalCount = totalCount;
    }
    
    public List<PhotoDto> getPhotos() {
        return photos;
    }
    
    public void setPhotos(List<PhotoDto> photos) {
        this.photos = photos;
    }
    
    public Integer getPageNumber() {
        return pageNumber;
    }
    
    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }
    
    public Integer getPageSize() {
        return pageSize;
    }
    
    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }
    
    public Long getTotalCount() {
        return totalCount;
    }
    
    public void setTotalCount(Long totalCount) {
        this.totalCount = totalCount;
    }
}

