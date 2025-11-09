package com.rapid.features.auth.service;

import com.rapid.domain.User;
import com.rapid.features.auth.dto.AuthResponse;
import com.rapid.features.auth.dto.LoginRequest;
import com.rapid.features.auth.dto.RegisterRequest;
import com.rapid.infrastructure.repository.UserRepository;
import com.rapid.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId("user-123");
        testUser.setEmail("test@example.com");
        testUser.setPasswordHash("encoded-password-hash");
    }

    @Test
    void testRegisterSuccessfully() {
        RegisterRequest request = new RegisterRequest("newuser@example.com", "password123");
        
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-hash");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtTokenProvider.generateToken("user-123", "test@example.com")).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("user-123", response.getUserId());
        assertEquals("jwt-token", response.getToken());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void testRegisterThrowsExceptionOnDuplicateEmail() {
        RegisterRequest request = new RegisterRequest("existing@example.com", "password123");
        
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(RuntimeException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterUsesPasswordEncoder() {
        RegisterRequest request = new RegisterRequest("newuser@example.com", "password123");
        
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-hash");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtTokenProvider.generateToken(anyString(), anyString())).thenReturn("token");

        authService.register(request);

        verify(passwordEncoder).encode("password123");
    }

    @Test
    void testLoginSuccessWithCorrectPassword() {
        LoginRequest request = new LoginRequest("test@example.com", "password123");
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encoded-password-hash")).thenReturn(true);
        when(jwtTokenProvider.generateToken("user-123", "test@example.com")).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("user-123", response.getUserId());
        assertEquals("test@example.com", response.getEmail());
        assertEquals("jwt-token", response.getToken());
    }

    @Test
    void testLoginThrowsExceptionOnWrongPassword() {
        LoginRequest request = new LoginRequest("test@example.com", "wrongpassword");
        
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", "encoded-password-hash")).thenReturn(false);

        assertThrows(RuntimeException.class, () -> authService.login(request));
        verify(jwtTokenProvider, never()).generateToken(anyString(), anyString());
    }

    @Test
    void testLoginThrowsExceptionOnNonExistentUser() {
        LoginRequest request = new LoginRequest("nonexistent@example.com", "password123");
        
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> authService.login(request));
    }
}

