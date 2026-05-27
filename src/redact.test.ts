/**
 * Comprehensive test suite for log redaction utility.
 *
 * Verifies that:
 * - Stellar secret seeds (S...) are redacted
 * - Stellar public keys (G...) are preserved
 * - Bearer tokens are redacted
 * - HMAC secrets are redacted
 * - Deep nested objects are handled
 * - Error objects and stack traces are sanitized
 * - Circular references are handled
 * - Max depth is enforced
 */

import {
  redactString,
  redactDeep,
  redactError,
  redactObject,
  containsStellarSecret,
  containsBearerToken,
  registerSensitiveKey,
  SENSITIVE_KEYS,
} from './redact';

// ---------------------------------------------------------------------------
// Test Data (Synthetic/Dummy Values)
// ---------------------------------------------------------------------------

// Synthetic Stellar secret seed (56 chars, starts with S)
const FAKE_STELLAR_SECRET = 'SALAACGR7QWWI7WQMXLA7YJKHQWZQMQOCQBJXTQXCWZGM7QWWI7WQMXLA';

// Synthetic Stellar public key (56 chars, starts with G)
const FAKE_STELLAR_PUBLIC = 'GALAACGR7QWWI7WQMXLA7YJKHQWZQMQOCQBJXTQXCWZGM7QWWI7WQMXLA';

// Synthetic Bearer token (JWT-like)
const FAKE_BEARER_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

// Synthetic HMAC secret (64 chars, hex)
const FAKE_HMAC_SECRET = 'a'.repeat(64);

// ---------------------------------------------------------------------------
// 1. redactString — String-level redaction
// ---------------------------------------------------------------------------

describe('redactString', () => {
  it('redacts Stellar secret seeds (S...)', () => {
    const input = `User secret: ${FAKE_STELLAR_SECRET}`;
    const output = redactString(input);

    expect(output).not.toContain(FAKE_STELLAR_SECRET);
    expect(output).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('preserves Stellar public keys (G...)', () => {
    const input = `User public key: ${FAKE_STELLAR_PUBLIC}`;
    const output = redactString(input);

    expect(output).toContain(FAKE_STELLAR_PUBLIC); // NOT redacted
  });

  it('redacts Bearer tokens', () => {
    const input = `Authorization: ${FAKE_BEARER_TOKEN}`;
    const output = redactString(input);

    expect(output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(output).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('redacts long secrets (40+ chars)', () => {
    const input = `HMAC secret: ${FAKE_HMAC_SECRET}`;
    const output = redactString(input);

    expect(output).not.toContain(FAKE_HMAC_SECRET);
    expect(output).toContain('[REDACTED_SECRET]');
  });

  it('handles multiple secrets in one string', () => {
    const input = `Secret: ${FAKE_STELLAR_SECRET}, Token: ${FAKE_BEARER_TOKEN}`;
    const output = redactString(input);

    expect(output).not.toContain(FAKE_STELLAR_SECRET);
    expect(output).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(output).toContain('[REDACTED_STELLAR_SECRET]');
    expect(output).toContain('[REDACTED_TOKEN]');
  });

  it('returns short strings unchanged (performance optimization)', () => {
    const input = 'short';
    const output = redactString(input);

    expect(output).toBe(input);
  });

  it('handles empty strings', () => {
    expect(redactString('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. redactObject — Object-level redaction
// ---------------------------------------------------------------------------

describe('redactObject', () => {
  it('redacts values for sensitive keys', () => {
    const input = {
      username: 'alice',
      password: 'super-secret-password',
      api_key: 'sk_live_1234567890',
    };

    const output = redactObject(input, 0, new WeakSet());

    expect(output.username).toBe('alice'); // Not sensitive
    expect(output.password).toBe('[REDACTED]');
    expect(output.api_key).toBe('[REDACTED]');
  });

  it('recursively redacts nested objects', () => {
    const input = {
      user: {
        name: 'alice',
        credentials: {
          password: 'secret123',
          token: 'abc123',
        },
      },
    };

    const output = redactObject(input, 0, new WeakSet());

    expect(output.user).toBeDefined();
    expect((output.user as Record<string, unknown>).name).toBe('alice');
    expect((output.user as Record<string, unknown>).credentials).toBeDefined();

    const credentials = (output.user as Record<string, unknown>).credentials as Record<string, unknown>;
    expect(credentials.password).toBe('[REDACTED]');
    expect(credentials.token).toBe('[REDACTED]');
  });

  it('redacts secrets in string values', () => {
    const input = {
      message: `User secret: ${FAKE_STELLAR_SECRET}`,
    };

    const output = redactObject(input, 0, new WeakSet());

    expect(output.message).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.message).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('handles case-insensitive key matching', () => {
    const input = {
      PASSWORD: 'secret',
      ApiKey: 'key123',
      WEBHOOK_SECRET: 'hmac456',
    };

    const output = redactObject(input, 0, new WeakSet());

    expect(output.PASSWORD).toBe('[REDACTED]');
    expect(output.ApiKey).toBe('[REDACTED]');
    expect(output.WEBHOOK_SECRET).toBe('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// 3. redactError — Error object redaction
// ---------------------------------------------------------------------------

describe('redactError', () => {
  it('redacts secrets in error messages', () => {
    const error = new Error(`Failed to authenticate with secret: ${FAKE_STELLAR_SECRET}`);
    const output = redactError(error, 0, new WeakSet());

    expect(output.message).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.message).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('redacts secrets in stack traces', () => {
    const error = new Error('Test error');
    // Simulate a stack trace with a secret
    error.stack = `Error: Test error\n    at function (file.ts:10:20)\n    Secret: ${FAKE_STELLAR_SECRET}`;

    const output = redactError(error, 0, new WeakSet());

    expect(output.stack).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.stack).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('preserves error name', () => {
    const error = new TypeError('Type error');
    const output = redactError(error, 0, new WeakSet());

    expect(output.name).toBe('TypeError');
  });

  it('redacts custom error properties', () => {
    const error = new Error('Test') as Error & { secret: string };
    error.secret = FAKE_HMAC_SECRET;

    const output = redactError(error, 0, new WeakSet());

    expect(output.secret).toBe('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// 4. redactDeep — Deep recursive redaction
// ---------------------------------------------------------------------------

describe('redactDeep', () => {
  it('handles primitives (no redaction)', () => {
    expect(redactDeep(42)).toBe(42);
    expect(redactDeep(true)).toBe(true);
    expect(redactDeep(null)).toBe(null);
    expect(redactDeep(undefined)).toBe(undefined);
  });

  it('redacts strings', () => {
    const input = `Secret: ${FAKE_STELLAR_SECRET}`;
    const output = redactDeep(input);

    expect(output).not.toContain(FAKE_STELLAR_SECRET);
    expect(output).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('redacts arrays', () => {
    const input = [
      'normal string',
      `Secret: ${FAKE_STELLAR_SECRET}`,
      { password: 'secret123' },
    ];

    const output = redactDeep(input) as unknown[];

    expect(output[0]).toBe('normal string');
    expect(output[1]).not.toContain(FAKE_STELLAR_SECRET);
    expect((output[2] as Record<string, unknown>).password).toBe('[REDACTED]');
  });

  it('redacts deeply nested objects (5+ levels)', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                secret: FAKE_STELLAR_SECRET,
              },
            },
          },
        },
      },
    };

    const output = redactDeep(input) as Record<string, unknown>;

    const level5 = (((((output.level1 as Record<string, unknown>).level2 as Record<string, unknown>).level3 as Record<string, unknown>).level4 as Record<string, unknown>).level5 as Record<string, unknown>);
    expect(level5.secret).toBe('[REDACTED]');
  });

  it('handles circular references', () => {
    const input: Record<string, unknown> = { name: 'test' };
    input.self = input; // Circular reference

    const output = redactDeep(input) as Record<string, unknown>;

    expect(output.name).toBe('test');
    expect(output.self).toBe('[CIRCULAR_REFERENCE]');
  });

  it('enforces max depth limit', () => {
    // Create a deeply nested object (25 levels)
    let input: Record<string, unknown> = { value: 'deep' };
    for (let i = 0; i < 25; i++) {
      input = { nested: input };
    }

    const output = redactDeep(input) as Record<string, unknown>;

    // Should hit max depth and return [MAX_DEPTH_EXCEEDED]
    let current = output;
    for (let i = 0; i < 20; i++) {
      current = current.nested as Record<string, unknown>;
    }

    expect(current.nested).toBe('[MAX_DEPTH_EXCEEDED]');
  });

  it('redacts Error objects', () => {
    const error = new Error(`Secret: ${FAKE_STELLAR_SECRET}`);
    const output = redactDeep(error) as Record<string, unknown>;

    expect(output.message).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.message).toContain('[REDACTED_STELLAR_SECRET]');
  });
});

// ---------------------------------------------------------------------------
// 5. Acceptance Criteria — Nested properties, errors, stack traces
// ---------------------------------------------------------------------------

describe('Acceptance Criteria', () => {
  it('AC1 — redacts Stellar secrets in nested objects', () => {
    const input = {
      user: {
        profile: {
          stellarAccount: {
            publicKey: FAKE_STELLAR_PUBLIC,
            secretKey: FAKE_STELLAR_SECRET,
          },
        },
      },
    };

    const output = redactDeep(input) as Record<string, unknown>;

    const stellarAccount = (((output.user as Record<string, unknown>).profile as Record<string, unknown>).stellarAccount as Record<string, unknown>);
    expect(stellarAccount.publicKey).toBe(FAKE_STELLAR_PUBLIC); // Preserved
    expect(stellarAccount.secretKey).not.toContain(FAKE_STELLAR_SECRET);
    expect(stellarAccount.secretKey).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('AC2 — redacts HMAC secrets in nested objects', () => {
    const input = {
      webhook: {
        config: {
          signing_key: FAKE_HMAC_SECRET,
          url: 'https://example.com/hook',
        },
      },
    };

    const output = redactDeep(input) as Record<string, unknown>;

    const config = ((output.webhook as Record<string, unknown>).config as Record<string, unknown>);
    expect(config.signing_key).toBe('[REDACTED]');
    expect(config.url).toBe('https://example.com/hook'); // Not redacted
  });

  it('AC3 — redacts Bearer tokens in nested objects', () => {
    const input = {
      request: {
        headers: {
          authorization: FAKE_BEARER_TOKEN,
          'content-type': 'application/json',
        },
      },
    };

    const output = redactDeep(input) as Record<string, unknown>;

    const headers = ((output.request as Record<string, unknown>).headers as Record<string, unknown>);
    expect(headers.authorization).toBe('[REDACTED]');
    expect(headers['content-type']).toBe('application/json');
  });

  it('AC4 — redacts secrets in raw Error objects', () => {
    const error = new Error(`Authentication failed with secret: ${FAKE_STELLAR_SECRET}`);
    const output = redactDeep(error) as Record<string, unknown>;

    expect(output.message).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.message).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('AC5 — redacts secrets in stringified stack traces', () => {
    const error = new Error('Test error');
    error.stack = `Error: Test error
    at processEvent (idempotency.ts:100:20)
    at async WebhookDeliveryService.deliver (webhookDelivery.ts:50:10)
    Secret seed: ${FAKE_STELLAR_SECRET}
    HMAC key: ${FAKE_HMAC_SECRET}`;

    const output = redactDeep(error) as Record<string, unknown>;

    expect(output.stack).not.toContain(FAKE_STELLAR_SECRET);
    expect(output.stack).not.toContain(FAKE_HMAC_SECRET);
    expect(output.stack).toContain('[REDACTED_STELLAR_SECRET]');
    expect(output.stack).toContain('[REDACTED_SECRET]');
  });

  it('AC6 — preserves Stellar public keys (G...) in all contexts', () => {
    const input = {
      message: `Public key: ${FAKE_STELLAR_PUBLIC}`,
      nested: {
        publicKey: FAKE_STELLAR_PUBLIC,
      },
      error: new Error(`Account: ${FAKE_STELLAR_PUBLIC}`),
    };

    const output = redactDeep(input) as Record<string, unknown>;

    expect(output.message).toContain(FAKE_STELLAR_PUBLIC);
    expect((output.nested as Record<string, unknown>).publicKey).toContain(FAKE_STELLAR_PUBLIC);
    expect((output.error as Record<string, unknown>).message).toContain(FAKE_STELLAR_PUBLIC);
  });
});

// ---------------------------------------------------------------------------
// 6. Utility Functions
// ---------------------------------------------------------------------------

describe('Utility Functions', () => {
  it('containsStellarSecret detects Stellar secrets', () => {
    expect(containsStellarSecret(`Secret: ${FAKE_STELLAR_SECRET}`)).toBe(true);
    expect(containsStellarSecret('No secret here')).toBe(false);
  });

  it('containsBearerToken detects Bearer tokens', () => {
    expect(containsBearerToken(FAKE_BEARER_TOKEN)).toBe(true);
    expect(containsBearerToken('No token here')).toBe(false);
  });

  it('registerSensitiveKey adds new sensitive keys', () => {
    const originalSize = SENSITIVE_KEYS.size;
    registerSensitiveKey('my_custom_secret');

    expect(SENSITIVE_KEYS.size).toBe(originalSize + 1);
    expect(SENSITIVE_KEYS.has('my_custom_secret')).toBe(true);

    // Test that it's actually redacted
    const input = { my_custom_secret: 'value123' };
    const output = redactDeep(input) as Record<string, unknown>;

    expect(output.my_custom_secret).toBe('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// 7. Edge Cases
// ---------------------------------------------------------------------------

describe('Edge Cases', () => {
  it('handles empty objects', () => {
    expect(redactDeep({})).toEqual({});
  });

  it('handles empty arrays', () => {
    expect(redactDeep([])).toEqual([]);
  });

  it('handles objects with null values', () => {
    const input = { key: null };
    expect(redactDeep(input)).toEqual({ key: null });
  });

  it('handles objects with undefined values', () => {
    const input = { key: undefined };
    expect(redactDeep(input)).toEqual({ key: undefined });
  });

  it('handles mixed arrays', () => {
    const input = [
      42,
      'string',
      null,
      { password: 'secret' },
      [1, 2, 3],
    ];

    const output = redactDeep(input) as unknown[];

    expect(output[0]).toBe(42);
    expect(output[1]).toBe('string');
    expect(output[2]).toBe(null);
    expect((output[3] as Record<string, unknown>).password).toBe('[REDACTED]');
    expect(output[4]).toEqual([1, 2, 3]);
  });

  it('handles very long strings (performance)', () => {
    const longString = 'a'.repeat(10000) + FAKE_STELLAR_SECRET + 'b'.repeat(10000);
    const output = redactString(longString);

    expect(output).not.toContain(FAKE_STELLAR_SECRET);
    expect(output).toContain('[REDACTED_STELLAR_SECRET]');
  });

  it('handles objects with numeric keys', () => {
    const input = { 0: 'value0', 1: 'value1', password: 'secret' };
    const output = redactDeep(input) as Record<string, unknown>;

    expect(output[0]).toBe('value0');
    expect(output[1]).toBe('value1');
    expect(output.password).toBe('[REDACTED]');
  });

  it('handles objects with symbol keys (skipped)', () => {
    const sym = Symbol('test');
    const input = { [sym]: 'value', password: 'secret' };
    const output = redactDeep(input) as Record<string, unknown>;

    // Symbols are not enumerable by Object.entries, so they're skipped
    expect(output.password).toBe('[REDACTED]');
  });
});
