import { describe, it, expect } from 'vitest';
import { validators } from '../validators';

describe('validators', () => {
  describe('validateEmail', () => {
    it('returns error for empty email', () => {
      expect(validators.validateEmail('')).not.toBeNull();
    });

    it('returns error for email without @', () => {
      expect(validators.validateEmail('notanemail')).not.toBeNull();
    });

    it('returns error for email without domain', () => {
      expect(validators.validateEmail('test@')).not.toBeNull();
    });

    it('returns null for valid email', () => {
      expect(validators.validateEmail('test@example.com')).toBeNull();
    });

    it('returns null for valid email with multiple domains', () => {
      expect(validators.validateEmail('user@subdomain.example.co.uk')).toBeNull();
    });

    it('trims whitespace before validation', () => {
      expect(validators.validateEmail('  test@example.com  ')).toBeNull();
    });

    it('rejects email with spaces in local part', () => {
      expect(validators.validateEmail('test user@example.com')).not.toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('returns error for empty password', () => {
      expect(validators.validatePassword('')).not.toBeNull();
    });

    it('returns error for password shorter than 8 characters', () => {
      const result = validators.validatePassword('short');
      expect(result).not.toBeNull();
      expect(result).toContain('8');
    });

    it('returns null for password with exactly 8 characters', () => {
      expect(validators.validatePassword('12345678')).toBeNull();
    });

    it('returns null for password longer than 8 characters', () => {
      expect(validators.validatePassword('ValidPassword123')).toBeNull();
    });

    it('returns error for whitespace-only password', () => {
      expect(validators.validatePassword('        ')).not.toBeNull();
    });

    it('accepts custom minimum length', () => {
      expect(validators.validatePassword('12345', 5)).toBeNull();
      expect(validators.validatePassword('1234', 5)).not.toBeNull();
    });
  });

  describe('validatePasswordMatch', () => {
    it('returns null when passwords match', () => {
      expect(validators.validatePasswordMatch('password', 'password')).toBeNull();
    });

    it('returns error when passwords do not match', () => {
      const result = validators.validatePasswordMatch('password1', 'password2');
      expect(result).not.toBeNull();
      expect(result).toContain('match');
    });

    it('is case-sensitive', () => {
      expect(validators.validatePasswordMatch('Password', 'password')).not.toBeNull();
    });

    it('handles empty passwords', () => {
      expect(validators.validatePasswordMatch('', '')).toBeNull();
      expect(validators.validatePasswordMatch('', 'password')).not.toBeNull();
    });
  });
});

