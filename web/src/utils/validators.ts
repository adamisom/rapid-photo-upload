/**
 * ============================================================================
 * FORM VALIDATORS
 * ============================================================================
 * 
 * Centralized validation logic for forms
 * Used by: LoginPage, RegisterPage, and future forms
 */

export const validators = {
  /**
   * Validate email address
   */
  validateEmail: (email: string): string | null => {
    if (!email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
