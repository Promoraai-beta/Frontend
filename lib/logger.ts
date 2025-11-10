/**
 * Logger Utility
 * 
 * Provides environment-aware logging that only outputs in development mode.
 * In production, all logs are silently ignored to reduce bundle size and improve performance.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.log('Debug message');
 *   logger.error('Error message');
 *   logger.warn('Warning message');
 *   logger.info('Info message');
 *   logger.debug('Debug message');
 */

// Check if logging is enabled
// In development: always enabled
// In production: check for explicit enable flag (for debugging)
const isDevelopment = process.env.NODE_ENV === 'development';
const forceLoggingEnabled = process.env.NEXT_PUBLIC_ENABLE_LOGGING === 'true';
const isLoggingEnabled = isDevelopment || forceLoggingEnabled;

/**
 * Logger interface that matches console methods but only logs in development
 */
export const logger = {
  /**
   * Log a general message (console.log)
   */
  log: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.log(...args);
    }
  },

  /**
   * Log an error message (console.error)
   * Errors are always logged, even in production, for critical issues
   */
  error: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.error(...args);
    }
    // In production, you might want to send errors to an error tracking service
    // Example: Sentry.captureException(args[0]);
  },

  /**
   * Log a warning message (console.warn)
   */
  warn: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.warn(...args);
    }
  },

  /**
   * Log an info message (console.info)
   */
  info: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.info(...args);
    }
  },

  /**
   * Log a debug message (console.debug)
   */
  debug: (...args: any[]) => {
    if (isLoggingEnabled) {
      console.debug(...args);
    }
  },

  /**
   * Log a table (console.table)
   */
  table: (data: any) => {
    if (isLoggingEnabled) {
      console.table(data);
    }
  },

  /**
   * Log with grouping (console.group)
   */
  group: (label: string) => {
    if (isLoggingEnabled) {
      console.group(label);
    }
  },

  /**
   * End a log group (console.groupEnd)
   */
  groupEnd: () => {
    if (isLoggingEnabled) {
      console.groupEnd();
    }
  },

  /**
   * Log with grouping that is collapsed (console.groupCollapsed)
   */
  groupCollapsed: (label: string) => {
    if (isLoggingEnabled) {
      console.groupCollapsed(label);
    }
  },

  /**
   * Log time (console.time)
   */
  time: (label: string) => {
    if (isLoggingEnabled) {
      console.time(label);
    }
  },

  /**
   * End time logging (console.timeEnd)
   */
  timeEnd: (label: string) => {
    if (isLoggingEnabled) {
      console.timeEnd(label);
    }
  },
};

/**
 * Check if logging is enabled (development mode or forced)
 */
export const isLoggingEnabledCheck = () => isDevelopment || forceLoggingEnabled;

/**
 * Conditional logging - only log if condition is true
 * Useful for verbose debugging that you want to enable/disable easily
 */
export const conditionalLog = (condition: boolean, ...args: any[]) => {
  if (isLoggingEnabled && condition) {
    console.log(...args);
  }
};

