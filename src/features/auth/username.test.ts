import { describe, expect, it } from 'vitest';
import { normalizeUsername, usernameFormatError } from './username.ts';

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  MattC ')).toBe('mattc');
  });
});

describe('usernameFormatError', () => {
  it('accepts valid usernames', () => {
    expect(usernameFormatError('matt_c1')).toBeNull();
    expect(usernameFormatError('abc')).toBeNull();
    expect(usernameFormatError('a'.repeat(20))).toBeNull();
  });

  it('rejects usernames that are too short or too long', () => {
    expect(usernameFormatError('ab')).toMatch(/at least/);
    expect(usernameFormatError('a'.repeat(21))).toMatch(/at most/);
  });

  it('rejects invalid characters', () => {
    expect(usernameFormatError('matt churchman')).toMatch(/lowercase letters/);
    expect(usernameFormatError('matt-c')).toMatch(/lowercase letters/);
    expect(usernameFormatError('Matt$')).toMatch(/lowercase letters/);
  });

  it('normalizes case before validating', () => {
    expect(usernameFormatError('MattC')).toBeNull();
  });
});
