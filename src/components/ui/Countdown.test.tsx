import { describe, expect, it } from 'vitest';
import { formatCountdown } from './Countdown';

describe('formatCountdown', () => {
  it('returns Locked at or below zero', () => {
    expect(formatCountdown(0)).toBe('Locked');
    expect(formatCountdown(-1000)).toBe('Locked');
  });

  it('formats seconds only under a minute', () => {
    expect(formatCountdown(45 * 1000)).toBe('45s');
  });

  it('formats minutes and seconds under an hour', () => {
    expect(formatCountdown(5 * 60 * 1000 + 12 * 1000)).toBe('5m 12s');
  });

  it('formats hours and minutes under a day', () => {
    expect(formatCountdown(2 * 60 * 60 * 1000 + 14 * 60 * 1000)).toBe('2h 14m');
  });

  it('formats days and hours at or over a day', () => {
    expect(formatCountdown(3 * 86400 * 1000 + 4 * 60 * 60 * 1000)).toBe('3d 4h');
  });
});
