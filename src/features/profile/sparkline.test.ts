import { describe, expect, it } from 'vitest';
import { sparklinePath, sparklinePoints } from './sparkline.ts';

describe('sparklinePoints', () => {
  it('returns nothing for an empty series', () => {
    expect(sparklinePoints([], 100, 20)).toEqual([]);
  });

  it('centers a single value', () => {
    expect(sparklinePoints([7], 100, 20)).toEqual([{ x: 50, y: 10 }]);
  });

  it('spreads x evenly and maps the min/max to the bottom/top edges', () => {
    const points = sparklinePoints([0, 5, 10], 100, 20);
    expect(points).toEqual([
      { x: 0, y: 20 },
      { x: 50, y: 10 },
      { x: 100, y: 0 },
    ]);
  });

  it('keeps every point on the midline when every value is equal', () => {
    const points = sparklinePoints([4, 4, 4], 100, 20);
    expect(points).toEqual([
      { x: 0, y: 10 },
      { x: 50, y: 10 },
      { x: 100, y: 10 },
    ]);
  });
});

describe('sparklinePath', () => {
  it('is empty with no values', () => {
    expect(sparklinePath([], 100, 20)).toBe('');
  });

  it('draws a single move-to for one value', () => {
    expect(sparklinePath([3], 100, 20)).toBe('M50.0,10.0');
  });

  it('draws a move then lines through the rest', () => {
    expect(sparklinePath([0, 10], 100, 20)).toBe('M0.0,20.0 L100.0,0.0');
  });
});
