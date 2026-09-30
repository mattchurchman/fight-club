import { describe, expect, it } from 'vitest';
import { mapAuthError } from './authErrors.ts';

describe('mapAuthError', () => {
  it('maps known Firebase auth error codes to friendly copy', () => {
    expect(mapAuthError('auth/wrong-password')).toBe('Incorrect password.');
    expect(mapAuthError('auth/email-already-in-use')).toBe(
      'An account already exists with that email.',
    );
  });

  it('falls back for unknown or missing codes', () => {
    expect(mapAuthError('auth/some-new-code-we-have-not-seen')).toBe(
      'Something went wrong. Please try again.',
    );
    expect(mapAuthError(undefined)).toBe('Something went wrong. Please try again.');
    expect(mapAuthError(null)).toBe('Something went wrong. Please try again.');
  });
});
