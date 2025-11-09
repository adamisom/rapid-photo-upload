/**
 * ============================================================================
 * FORM VALIDATORS
 * ============================================================================
 * 
 * Validation functions for form inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { field: 'email', message: 'Email is required' };
  }
  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Invalid email format' };
  }
  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }
  if (password.length < 8) {
    return { field: 'password', message: 'Password must be at least 8 characters' };
  }
  return null;
};

/**
 * Validate passwords match (for register confirmation)
 */
export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationError | null => {
  if (password !== confirmPassword) {
    return { field: 'confirmPassword', message: 'Passwords do not match' };
  }
  return null;
};

/**
 * Validate login form
 */
export const validateLoginForm = (email: string, password: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(password);
  if (passwordError) errors.push(passwordError);

  return errors;
};

/**
 * Validate register form
 */
export const validateRegisterForm = (
  email: string,
  password: string,
  confirmPassword: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(password);
  if (passwordError) errors.push(passwordError);

  const matchError = validatePasswordMatch(password, confirmPassword);
  if (matchError) errors.push(matchError);

  return errors;
};

