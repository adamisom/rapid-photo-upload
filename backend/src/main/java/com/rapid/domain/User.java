package com.rapid.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DOMAIN ENTITY: User
 * 
 * Represents a user in the system following Domain-Driven Design (DDD) principles.
 * This is the root of the User Aggregate, responsible for user identity and authentication.
 * 
 * Key Design Decisions:
 * - Email is unique identifier for authentication
 * - Password stored as bcrypt hash (never plain text)
 * - OneToMany relationships to Photos and UploadBatches are navigational only
 * - No business logic in User entity (authentication handled by AuthService)
 * 
 * This is a pure domain model with no framework dependencies beyond JPA annotations.
 * The entity focuses on representing the user concept in the domain, not technical
 * infrastructure concerns.
 */
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String passwordHash;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Photo> photos = new ArrayList<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UploadBatch> batches = new ArrayList<>();

    // Constructors
    public User() {
    }

    public User(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<Photo> getPhotos() {
        return photos;
    }

    public void setPhotos(List<Photo> photos) {
        this.photos = photos;
    }

    public List<UploadBatch> getBatches() {
        return batches;
    }

    public void setBatches(List<UploadBatch> batches) {
        this.batches = batches;
    }
}

