/**
 * Form validation utilities for mobile app
 * Used by: LoginScreen, RegisterScreen
 */

export const validators = {
  /**
   * Validate email address
   */
  validateEmail: (email: string): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  /**
   * Validate password
   */
  validatePassword: (password: string, minLength = 8): string | null => {
    if (!password.trim()) {
      return 'Password is required';
    }
    if (password.length < minLength) {
      return `Password must be at least ${minLength} characters`;
    }
    return null;
  },

  /**
   * Validate password confirmation matches
   */
  validatePasswordMatch: (password: string, confirmPassword: string): string | null => {
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  },
};

