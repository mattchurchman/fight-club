import { sparklinePath } from './sparkline.ts';

const WIDTH = 280;
const HEIGHT = 48;

interface SparklineProps {
  values: number[];
}

/** Points per event this season, oldest to newest. One dot when there's only one event so far. */
export function Sparkline({ values }: SparklineProps) {
  if (values.length === 0) {
    return <p className="text-sm text-muted">No events scored yet this season.</p>;
  }

  if (values.length === 1) {
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-12 w-full" aria-hidden="true">
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={3} fill="var(--color-gold)" />
      </svg>
    );
  }

  const path = sparklinePath(values, WIDTH, HEIGHT);
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-12 w-full" aria-hidden="true">
      <path d={path} fill="none" stroke="var(--color-gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
