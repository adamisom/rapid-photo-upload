import { describe, it, expect } from 'vitest';
import { formatFileSize, formatTimeRemaining } from '../formatters';

describe('formatters', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes correctly (< 1KB)', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB'); // 1.5 * 1024
      expect(formatFileSize(102400)).toBe('100 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB'); // 1 * 1024 * 1024
      expect(formatFileSize(5242880)).toBe('5 MB'); // 5 * 1024 * 1024
      expect(formatFileSize(1572864)).toBe('1.5 MB'); // 1.5 * 1024 * 1024
      expect(formatFileSize(10485760)).toBe('10 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB'); // 1 * 1024^3
      expect(formatFileSize(2147483648)).toBe('2 GB'); // 2 * 1024^3
      expect(formatFileSize(1610612736)).toBe('1.5 GB'); // 1.5 * 1024^3
    });

    it('rounds to 2 decimal places', () => {
      expect(formatFileSize(1536000)).toBe('1.46 MB'); // Should round to 2 decimals
      expect(formatFileSize(2500000)).toBe('2.38 MB');
    });

    it('handles typical file sizes', () => {
      expect(formatFileSize(50000)).toBe('48.83 KB'); // Small image
      expect(formatFileSize(2097152)).toBe('2 MB'); // 2MB photo
      expect(formatFileSize(104857600)).toBe('100 MB'); // Large video
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats seconds correctly (< 1 minute)', () => {
      expect(formatTimeRemaining(0)).toBe('0s');
      expect(formatTimeRemaining(15)).toBe('15s');
      expect(formatTimeRemaining(45)).toBe('45s');
      expect(formatTimeRemaining(59)).toBe('59s');
    });

    it('formats minutes and seconds correctly (< 1 hour)', () => {
      expect(formatTimeRemaining(60)).toBe('1m 0s');
      expect(formatTimeRemaining(90)).toBe('1m 30s');
      expect(formatTimeRemaining(125)).toBe('2m 5s');
      expect(formatTimeRemaining(300)).toBe('5m 0s');
      expect(formatTimeRemaining(3599)).toBe('59m 59s');
    });

    it('formats hours and minutes correctly', () => {
      expect(formatTimeRemaining(3600)).toBe('1h 0m');
      expect(formatTimeRemaining(3660)).toBe('1h 1m');
      expect(formatTimeRemaining(5400)).toBe('1h 30m');
      expect(formatTimeRemaining(7200)).toBe('2h 0m');
      expect(formatTimeRemaining(7325)).toBe('2h 2m'); // Drops seconds
      expect(formatTimeRemaining(10800)).toBe('3h 0m');
    });

    it('handles typical upload durations', () => {
      expect(formatTimeRemaining(30)).toBe('30s'); // Quick upload
      expect(formatTimeRemaining(120)).toBe('2m 0s'); // 2 minute upload
      expect(formatTimeRemaining(600)).toBe('10m 0s'); // 10 minute upload
      expect(formatTimeRemaining(1800)).toBe('30m 0s'); // 30 minute upload
    });

    it('drops seconds when showing hours', () => {
      expect(formatTimeRemaining(3665)).toBe('1h 1m'); // 1h 1m 5s -> 1h 1m
      expect(formatTimeRemaining(7325)).toBe('2h 2m'); // 2h 2m 5s -> 2h 2m
    });
  });
});

