import { validators } from '../validators';

describe('validators', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validators.validateEmail('')).toBe('Email is required');
    });

    it('returns error for email without @', () => {
      expect(validators.validateEmail('notanemail')).toBe('Please enter a valid email address');
    });

    it('returns error for email without domain', () => {
      expect(validators.validateEmail('test@')).toBe('Please enter a valid email address');
    });

    it('returns null for valid email', () => {
      expect(validators.validateEmail('test@example.com')).toBeNull();
    });

    it('trims whitespace before validation', () => {
      expect(validators.validateEmail('  test@example.com  ')).toBeNull();
    });

    it('rejects email with spaces', () => {
      expect(validators.validateEmail('test user@example.com')).toBe('Please enter a valid email address');
    });
  });

  describe('validatePassword', () => {
    it('returns error for empty password', () => {
      expect(validators.validatePassword('')).toBe('Password is required');
    });

    it('returns error for password shorter than 8 characters', () => {
      const result = validators.validatePassword('short');
      expect(result).toContain('8');
    });

    it('returns null for password with 8+ characters', () => {
      expect(validators.validatePassword('12345678')).toBeNull();
      expect(validators.validatePassword('ValidPassword123')).toBeNull();
    });

    it('returns error for whitespace-only password', () => {
      expect(validators.validatePassword('        ')).toBe('Password is required');
    });

    it('accepts custom minimum length', () => {
      expect(validators.validatePassword('12345', 5)).toBeNull();
      expect(validators.validatePassword('1234', 5)).toContain('5');
    });
  });

  describe('validatePasswordMatch', () => {
    it('returns null when passwords match', () => {
      expect(validators.validatePasswordMatch('password', 'password')).toBeNull();
    });

    it('returns error when passwords do not match', () => {
      expect(validators.validatePasswordMatch('password1', 'password2')).toBe('Passwords do not match');
    });

    it('is case-sensitive', () => {
      expect(validators.validatePasswordMatch('Password', 'password')).toBe('Passwords do not match');
    });

    it('handles empty passwords', () => {
      expect(validators.validatePasswordMatch('', '')).toBeNull();
      expect(validators.validatePasswordMatch('', 'password')).toBe('Passwords do not match');
    });
  });
});

