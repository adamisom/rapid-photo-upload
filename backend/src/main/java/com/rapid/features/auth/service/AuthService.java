package com.rapid.features.auth.service;

import com.rapid.domain.User;
import com.rapid.features.auth.dto.AuthResponse;
import com.rapid.features.auth.dto.LoginRequest;
import com.rapid.features.auth.dto.RegisterRequest;
import com.rapid.infrastructure.repository.UserRepository;
import com.rapid.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * AUTH SERVICE: User authentication and registration
 * 
 * Handles user authentication following the Auth Bounded Context.
 * This service combines both command (register) and query (login) operations
 * as authentication is a cohesive unit that doesn't benefit from CQRS separation.
 * 
 * Security considerations:
 * - Passwords hashed with BCrypt (handled by PasswordEncoder)
 * - JWT tokens generated with configurable expiration
 * - Email uniqueness enforced at database level
 * - No plain text passwords ever stored or logged
 * 
 * This is part of the Vertical Slice Architecture - all auth logic is in
 * the features.auth package, completely independent from upload and photo features.
 */
@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user = userRepository.save(user);
        
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
    
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }
        
        String token = jwtTokenProvider.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }
}

