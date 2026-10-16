import { describe, expect, it } from 'vitest';
import { headlineSize } from './format.ts';

describe('headlineSize', () => {
  it('returns text-2xl for 18 characters or fewer', () => {
    expect(headlineSize('SILVA / WANG')).toBe('text-2xl');
    expect(headlineSize('A'.repeat(18))).toBe('text-2xl');
  });

  it('returns text-xl for 19 to 26 characters', () => {
    expect(headlineSize('A'.repeat(19))).toBe('text-xl');
    expect(headlineSize('DELLA MADDALENA VS. PRATES')).toBe('text-xl'); // 26 chars
  });

  it('returns text-lg beyond 26 characters', () => {
    expect(headlineSize('A'.repeat(27))).toBe('text-lg');
  });
});
