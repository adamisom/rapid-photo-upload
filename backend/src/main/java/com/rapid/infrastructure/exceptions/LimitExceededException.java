package com.rapid.infrastructure.exceptions;

/**
 * Exception thrown when a global limit is exceeded
 * Used for AWS cost control (user limit, photo limit, storage limit, file size)
 */
public class LimitExceededException extends RuntimeException {
    
    private final String limitType;
    
    public LimitExceededException(String message, String limitType) {
        super(message);
        this.limitType = limitType;
    }
    
    public String getLimitType() {
        return limitType;
    }
}

