/**
 * @module redact
 *
 * Comprehensive log redaction utility for sanitizing sensitive data before
 * it reaches any log transport layer.
 *
 * ## Target Patterns
 * - **Stellar Secret Seeds:** 56-character keys starting with `S` (base32).
 * - **Stellar Public Keys:** 56-character keys starting with `G` (NOT redacted).
 * - **Webhook HMAC Secrets:** Keys like `secret`, `signing_key`, etc.
 * - **Bearer Tokens:** OAuth/JWT tokens in `Authorization` headers.
 * - **Generic Secrets:** `password`, `api_key`, `private_key`, etc.
 *
 * ## Performance Considerations
 * - **Max Depth:** Recursion limited to 20 levels to prevent stack overflow.
 * - **Circular References:** Tracked with `WeakSet` to avoid infinite loops.
 * - **Lazy Regex:** Patterns compiled once at module load time.
 * - **Early Exit:** Primitives (numbers, booleans, null) skip redaction.
 *
 * ## Security
 * - Public keys (G...) are preserved for debugging.
 * - All secrets are replaced with `[REDACTED]` or similar markers.
 * - Error stack traces are deeply sanitized.
 */

// ---------------------------------------------------------------------------
// Sensitive Key Patterns
// ---------------------------------------------------------------------------

/**
 * Set of lowercase key names that should always be redacted.
 *
 * Developers can extend this set by importing and adding new keys:
 * ```typescript
 * import { SENSITIVE_KEYS } from './redact';
 * SENSITIVE_KEYS.add('my_custom_secret');
 * ```
 */
export const SENSITIVE_KEYS = new Set<string>([
  // Webhook & HMAC secrets
  'secret',
  'signing_key',
  'webhook_secret',
  'hmac_secret',
  'api_secret',
  'client_secret',
  'consumer_secret',

  // Authentication
  'password',
  'passwd',
  'pwd',
  'api_key',
  'apikey',
  'private_key',
  'privatekey',
  'authorization',
  'token',
  'access_token',
  'refresh_token',
  'bearer',
  'oauth_token',
  'session_token',

  // Stellar-specific (though seeds are caught by regex)
  'stellar_secret',
  'stellar_seed',
]);

// ---------------------------------------------------------------------------
// Regex Patterns (compiled once at module load)
// ---------------------------------------------------------------------------

/**
 * Regex for Stellar secret seeds.
 *
 * Pattern: `S[A-Z2-7]{55}` (56 chars total, base32 alphabet).
 * Example: `SALAACGR7QWWI7WQMXLA7YJKHQWZQMQOCQBJXTQXCWZGM7QWWI7WQMXLA`
 */
const STELLAR_SECRET_REGEX = /S[A-Z2-7]{55}/g;

/**
 * Regex for Stellar public keys (to preserve them).
 *
 * Pattern: `G[A-Z2-7]{55}` (56 chars total, base32 alphabet).
 * Example: `GALAACGR7QWWI7WQMXLA7YJKHQWZQMQOCQBJXTQXCWZGM7QWWI7WQMXLA`
 */
const STELLAR_PUBLIC_REGEX = /G[A-Z2-7]{55}/g;

/**
 * Regex for Bearer tokens.
 *
 * Pattern: `Bearer <token>` where token is base64url-encoded.
 * Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
 */
const BEARER_TOKEN_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;

/**
 * Regex for generic long secrets (40+ chars of base64/hex).
 *
 * This catches HMAC secrets, API keys, and other long random strings.
 * We preserve Stellar public keys (G...) by checking the match.
 */
const LONG_SECRET_REGEX = /[A-Za-z0-9+/=]{40,}/g;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Maximum recursion depth for object traversal.
 * Prevents stack overflow on deeply nested structures.
 */
const MAX_DEPTH = 20;

/**
 * Minimum string length to apply regex redaction.
 * Strings shorter than this are assumed to not contain secrets.
 */
const MIN_STRING_LENGTH_FOR_REGEX = 10;

// ---------------------------------------------------------------------------
// Core Redaction Functions
// ---------------------------------------------------------------------------

/**
 * Redact sensitive data from a string.
 *
 * Applies multiple passes to catch different secret patterns:
 * 1. Stellar secret seeds (S...)
 * 2. Bearer tokens
 * 3. Generic long secrets (40+ chars)
 *
 * IMPORTANT: Stellar public keys (G...) are preserved.
 *
 * @param str - Input string to redact.
 * @returns Redacted string with secrets replaced.
 */
export function redactString(str: string): string {
  // Early exit for short strings (performance optimization)
  if (str.length < MIN_STRING_LENGTH_FOR_REGEX) {
    return str;
  }

  let result = str;

  // Pass 1: Redact Stellar secret seeds (S...)
  result = result.replace(STELLAR_SECRET_REGEX, '[REDACTED_STELLAR_SECRET]');

  // Pass 2: Redact Bearer tokens
  result = result.replace(BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]');

  // Pass 3: Redact generic long secrets (40+ chars)
  result = result.replace(LONG_SECRET_REGEX, (match) => {
    // Preserve Stellar public keys (G...)
    if (match.startsWith('G') && match.length === 56 && STELLAR_PUBLIC_REGEX.test(match)) {
      return match; // Keep public keys
    }
    return '[REDACTED_SECRET]';
  });

  return result;
}

/**
 * Redact sensitive data from an Error object.
 *
 * Special handling for:
 * - `error.message` (may contain secrets)
 * - `error.stack` (may contain secrets in stack traces)
 * - Other error properties (recursively redacted)
 *
 * @param error - Error object to redact.
 * @param depth - Current recursion depth.
 * @param visited - Set of visited objects (circular reference detection).
 * @returns Redacted error object (plain object, not Error instance).
 */
export function redactError(
  error: Error,
  depth: number,
  visited: WeakSet<object>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: error.name,
    message: redactString(error.message),
  };

  // Redact stack trace if present
  if (error.stack) {
    result.stack = redactString(error.stack);
  }

  // Redact other error properties (e.g., custom fields)
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      result[key] = redactDeep(value, depth + 1, visited);
    }
  }

  return result;
}

/**
 * Redact sensitive data from a plain object.
 *
 * Applies two strategies:
 * 1. **Key-based redaction:** If the key name is in `SENSITIVE_KEYS`, redact the value.
 * 2. **Value-based redaction:** Recursively redact the value.
 *
 * @param obj - Plain object to redact.
 * @param depth - Current recursion depth.
 * @param visited - Set of visited objects (circular reference detection).
 * @returns Redacted object.
 */
export function redactObject(
  obj: Record<string, unknown>,
  depth: number,
  visited: WeakSet<object>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Key-based redaction: if the key is sensitive, redact the value
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
      continue;
    }

    // Value-based redaction: recursively redact the value
    result[key] = redactDeep(value, depth + 1, visited);
  }

  return result;
}

/**
 * Recursively redact sensitive data from any value.
 *
 * Handles:
 * - Strings (regex-based redaction)
 * - Objects (key-based + recursive redaction)
 * - Arrays (element-wise redaction)
 * - Errors (special handling for stack traces)
 * - Primitives (no redaction needed)
 *
 * ## Circular Reference Detection
 * Uses a `WeakSet` to track visited objects and prevent infinite loops.
 *
 * ## Max Depth Guard
 * Stops recursion at depth 20 to prevent stack overflow.
 *
 * @param value - Value to redact.
 * @param depth - Current recursion depth (default: 0).
 * @param visited - Set of visited objects (default: new WeakSet).
 * @returns Redacted value.
 */
export function redactDeep(
  value: unknown,
  depth: number = 0,
  visited: WeakSet<object> = new WeakSet(),
): unknown {
  // Guard: Prevent infinite recursion
  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Primitive types: string
  if (typeof value === 'string') {
    return redactString(value);
  }

  // Primitive types: number, boolean, null, undefined
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return value; // No redaction needed
  }

  // Circular reference detection
  if (typeof value === 'object' && value !== null) {
    if (visited.has(value)) {
      return '[CIRCULAR_REFERENCE]';
    }
    visited.add(value);
  }

  // Arrays: redact each element
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, depth + 1, visited));
  }

  // Error objects: special handling
  if (value instanceof Error) {
    return redactError(value, depth, visited);
  }

  // Plain objects: key-based + recursive redaction
  if (typeof value === 'object' && value !== null) {
    return redactObject(value as Record<string, unknown>, depth, visited);
  }

  // Fallback: return as-is (e.g., functions, symbols)
  return value;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Check if a string contains a Stellar secret seed.
 *
 * Useful for pre-flight checks before logging.
 *
 * @param str - String to check.
 * @returns `true` if the string contains a Stellar secret seed.
 */
export function containsStellarSecret(str: string): boolean {
  return STELLAR_SECRET_REGEX.test(str);
}

/**
 * Check if a string contains a Bearer token.
 *
 * @param str - String to check.
 * @returns `true` if the string contains a Bearer token.
 */
export function containsBearerToken(str: string): boolean {
  return BEARER_TOKEN_REGEX.test(str);
}

/**
 * Register a new sensitive key for redaction.
 *
 * Developers can call this function to add custom sensitive keys:
 * ```typescript
 * registerSensitiveKey('my_custom_secret');
 * ```
 *
 * @param key - Key name to register (will be lowercased).
 */
export function registerSensitiveKey(key: string): void {
  SENSITIVE_KEYS.add(key.toLowerCase());
}
