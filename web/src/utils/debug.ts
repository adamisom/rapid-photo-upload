/**
 * Debug utility - only logs in development mode
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

export const debugLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log('[DEBUG]', ...args);
  }
};

export const debugError = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error('[DEBUG ERROR]', ...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (isDevelopment) {
    console.warn('[DEBUG WARN]', ...args);
  }
};

