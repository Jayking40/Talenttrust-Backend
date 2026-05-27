/**
 * @module logger
 *
 * Centralized logger with automatic redaction of sensitive data.
 *
 * ## Usage
 * Replace all `console.log`, `console.error`, `console.warn` calls with:
 * ```typescript
 * import { logger } from './logger';
 *
 * logger.log('User logged in', { userId: 123 });
 * logger.error('Authentication failed', error);
 * logger.warn('Rate limit approaching', { provider: 'acme' });
 * ```
 *
 * ## Security
 * All log arguments are automatically redacted before being written to the
 * console. This ensures that secrets (Stellar seeds, HMAC keys, Bearer tokens)
 * never reach the log transport layer.
 *
 * ## Performance
 * Redaction is applied lazily (only when logging). No overhead for code paths
 * that don't log.
 */

import { redactDeep } from './redact';

// ---------------------------------------------------------------------------
// Safe Logging Functions
// ---------------------------------------------------------------------------

/**
 * Safe log function that redacts sensitive data before logging.
 *
 * @param level - Log level ('log', 'error', 'warn', 'info', 'debug').
 * @param args - Arguments to log (will be redacted).
 */
function safeLog(level: 'log' | 'error' | 'warn' | 'info' | 'debug', ...args: unknown[]): void {
  const redacted = args.map((arg) => redactDeep(arg));
  console[level](...redacted);
}

// ---------------------------------------------------------------------------
// Logger API
// ---------------------------------------------------------------------------

/**
 * Centralized logger with automatic redaction.
 *
 * Use this instead of `console.log`, `console.error`, etc. to ensure
 * sensitive data is never logged.
 *
 * @example
 * ```typescript
 * import { logger } from './logger';
 *
 * logger.log('User logged in', { userId: 123, secret: 'S...' });
 * // Output: User logged in { userId: 123, secret: '[REDACTED]' }
 * ```
 */
export const logger = {
  /**
   * Log informational messages.
   *
   * @param args - Arguments to log (will be redacted).
   */
  log(...args: unknown[]): void {
    safeLog('log', ...args);
  },

  /**
   * Log error messages.
   *
   * @param args - Arguments to log (will be redacted).
   */
  error(...args: unknown[]): void {
    safeLog('error', ...args);
  },

  /**
   * Log warning messages.
   *
   * @param args - Arguments to log (will be redacted).
   */
  warn(...args: unknown[]): void {
    safeLog('warn', ...args);
  },

  /**
   * Log informational messages (alias for `log`).
   *
   * @param args - Arguments to log (will be redacted).
   */
  info(...args: unknown[]): void {
    safeLog('info', ...args);
  },

  /**
   * Log debug messages.
   *
   * @param args - Arguments to log (will be redacted).
   */
  debug(...args: unknown[]): void {
    safeLog('debug', ...args);
  },
};

// ---------------------------------------------------------------------------
// Legacy Console Wrapper (Optional)
// ---------------------------------------------------------------------------

/**
 * Wrap the global `console` object to automatically redact all logs.
 *
 * WARNING: This is a global monkey-patch. Use with caution.
 * Only enable this if you want to ensure that ALL console.log calls
 * (including third-party libraries) are redacted.
 *
 * @example
 * ```typescript
 * import { wrapConsole } from './logger';
 *
 * wrapConsole(); // Enable global redaction
 *
 * console.log('Secret:', 'S...'); // Automatically redacted
 * ```
 */
export function wrapConsole(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: unknown[]) => {
    const redacted = args.map((arg) => redactDeep(arg));
    originalLog(...redacted);
  };

  console.error = (...args: unknown[]) => {
    const redacted = args.map((arg) => redactDeep(arg));
    originalError(...redacted);
  };

  console.warn = (...args: unknown[]) => {
    const redacted = args.map((arg) => redactDeep(arg));
    originalWarn(...redacted);
  };

  console.info = (...args: unknown[]) => {
    const redacted = args.map((arg) => redactDeep(arg));
    originalInfo(...redacted);
  };

  console.debug = (...args: unknown[]) => {
    const redacted = args.map((arg) => redactDeep(arg));
    originalDebug(...redacted);
  };
}
