package com.rapid.features.photos.controller;

import com.rapid.features.photos.dto.PhotoDto;
import com.rapid.features.photos.dto.PhotoListResponse;
import com.rapid.features.photos.service.PhotoCommandService;
import com.rapid.features.photos.service.PhotoQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/photos")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class PhotoController {
    
    @Autowired
    private PhotoQueryService photoQueryService;
    
    @Autowired
    private PhotoCommandService photoCommandService;
    
    @GetMapping
    public ResponseEntity<?> listPhotos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        String userId = getCurrentUserId();
        PhotoListResponse response = photoQueryService.getUserPhotos(userId, page, pageSize);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{photoId}")
    public ResponseEntity<?> getPhoto(@PathVariable String photoId) {
        String userId = getCurrentUserId();
        PhotoDto response = photoQueryService.getPhotoById(userId, photoId);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{photoId}")
    public ResponseEntity<?> deletePhoto(@PathVariable String photoId) {
        String userId = getCurrentUserId();
        photoCommandService.deletePhoto(userId, photoId);
        return ResponseEntity.ok(Map.of("status", "success"));
    }
    
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        throw new RuntimeException("User not authenticated");
    }
}

