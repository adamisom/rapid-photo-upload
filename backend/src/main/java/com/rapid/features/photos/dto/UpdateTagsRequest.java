package com.rapid.features.photos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class UpdateTagsRequest {
    
    @NotNull(message = "Tags cannot be null")
    @Size(max = 3, message = "Maximum 3 tags allowed")
    private List<@Size(max = 50, message = "Each tag must be 50 characters or less") String> tags;
    
    public UpdateTagsRequest() {
    }
    
    public UpdateTagsRequest(List<String> tags) {
        this.tags = tags;
    }
    
    public List<String> getTags() {
        return tags;
    }
    
    public void setTags(List<String> tags) {
        this.tags = tags;
    }
}

