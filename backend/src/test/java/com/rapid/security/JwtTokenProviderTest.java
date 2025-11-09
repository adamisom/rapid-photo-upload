package com.rapid.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestPropertySource(properties = {
    "jwt.secret=test-secret-key-that-is-at-least-64-characters-long-for-hs512-algorithm-test",
    "jwt.expiration=3600000"
})
class JwtTokenProviderTest {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String validToken;
    private final String testUserId = "test-user-123";
    private final String testEmail = "test@example.com";

    @BeforeEach
    void setUp() {
        validToken = jwtTokenProvider.generateToken(testUserId, testEmail);
    }

    @Test
    void testGenerateTokenCreatesValidToken() {
        assertNotNull(validToken);
        assertFalse(validToken.isEmpty());
        // Token should have 3 parts separated by dots: header.payload.signature
        assertEquals(3, validToken.split("\\.").length);
    }

    @Test
    void testGetUserIdFromValidToken() {
        String extractedUserId = jwtTokenProvider.getUserIdFromToken(validToken);
        assertEquals(testUserId, extractedUserId);
    }

    @Test
    void testValidateTokenSucceedsForValidToken() {
        assertTrue(jwtTokenProvider.validateToken(validToken));
    }

    @Test
    void testValidateTokenRejectsMalformedToken() {
        String malformedToken = "not.a.valid.jwt";
        assertFalse(jwtTokenProvider.validateToken(malformedToken));
    }

    @Test
    void testValidateTokenRejectsEmptyToken() {
        assertFalse(jwtTokenProvider.validateToken(""));
    }

    @Test
    void testValidateTokenRejectedTamperedToken() {
        // Take a valid token and tamper with the signature
        String tamperedToken = validToken.substring(0, validToken.length() - 5) + "XXXXX";
        assertFalse(jwtTokenProvider.validateToken(tamperedToken));
    }
}

