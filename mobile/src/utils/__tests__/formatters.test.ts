import { formatFileSize, formatTimeRemaining } from '../formatters';

describe('formatters', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats seconds', () => {
      expect(formatTimeRemaining(45)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatTimeRemaining(90)).toBe('1m 30s');
      expect(formatTimeRemaining(125)).toBe('2m 5s');
    });

    it('formats hours and minutes', () => {
      expect(formatTimeRemaining(3600)).toBe('1h 0m');
      expect(formatTimeRemaining(3660)).toBe('1h 1m');
      expect(formatTimeRemaining(7200)).toBe('2h 0m');
    });

    it('drops seconds when showing hours', () => {
      expect(formatTimeRemaining(3665)).toBe('1h 1m');
    });
  });
});

