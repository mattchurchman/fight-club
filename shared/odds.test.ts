import { describe, expect, it } from 'vitest';
import { americanToDecimal, formatAmerican, impliedProbability, median } from './odds';

describe('americanToDecimal', () => {
  it('converts a favorite (negative)', () => {
    expect(americanToDecimal(-200)).toBeCloseTo(1.5);
  });

  it('converts an underdog (positive)', () => {
    expect(americanToDecimal(150)).toBeCloseTo(2.5);
  });

  it('handles even odds at the boundary (+100)', () => {
    expect(americanToDecimal(100)).toBeCloseTo(2);
  });

  it('handles even odds at the boundary (-100)', () => {
    expect(americanToDecimal(-100)).toBeCloseTo(2);
  });

  it('handles a huge underdog', () => {
    expect(americanToDecimal(2000)).toBeCloseTo(21);
  });

  it('matches the GAME_RULES E6 worked example (-110)', () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9090909, 5);
  });
});

describe('formatAmerican', () => {
  it('formats a positive price with a leading +', () => {
    expect(formatAmerican(150)).toBe('+150');
  });

  it('formats a negative price with a minus sign', () => {
    expect(formatAmerican(-200)).toBe('−200');
  });

  it('formats +100 and -100', () => {
    expect(formatAmerican(100)).toBe('+100');
    expect(formatAmerican(-100)).toBe('−100');
  });
});

describe('impliedProbability', () => {
  it('gives 50% at even odds', () => {
    expect(impliedProbability(100)).toBeCloseTo(0.5);
    expect(impliedProbability(-100)).toBeCloseTo(0.5);
  });

  it('gives a higher probability for a bigger favorite', () => {
    expect(impliedProbability(-400)).toBeCloseTo(0.8);
  });

  it('gives a lower probability for a bigger underdog', () => {
    expect(impliedProbability(900)).toBeCloseTo(0.1);
  });
});

describe('median', () => {
  it('averages the two middle values of an even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('picks the middle value of an odd-length array', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('handles a single value', () => {
    expect(median([42])).toBe(42);
  });

  it('does not mutate the input array', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it('throws on an empty array', () => {
    expect(() => median([])).toThrow();
  });
});
