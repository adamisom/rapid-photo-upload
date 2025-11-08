package com.rapid.features.auth.dto;

public class AuthResponse {
    private String token;
    private String userId;
    private String email;

    // Constructors
    public AuthResponse() {
    }

    public AuthResponse(String token, String userId, String email) {
        this.token = token;
        this.userId = userId;
        this.email = email;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}

