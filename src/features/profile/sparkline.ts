// Pure point/path math for the profile's season sparkline (docs/tasks/T21). No chart library —
// the component renders this `d` string straight into an inline `<svg><path>`.

export interface SparklinePoint {
  x: number;
  y: number;
}

/**
 * Normalizes `values` into an SVG viewport of `width`×`height`. A single value centers vertically
 * (there's no slope to show); an empty list returns no points at all.
 */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
): SparklinePoint[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x: width / 2, y: height / 2 }];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = min === max;

  return values.map((value, i) => ({
    x: (i / (values.length - 1)) * width,
    y: flat ? height / 2 : height - ((value - min) / (max - min)) * height,
  }));
}

/** An SVG path `d` attribute through `values`, or `''` when there's nothing to draw. */
export function sparklinePath(values: readonly number[], width: number, height: number): string {
  const points = sparklinePoints(values, width, height);
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { x, y } = points[0]!;
    return `M${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
