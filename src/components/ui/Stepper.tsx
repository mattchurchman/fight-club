import clsx from 'clsx';
import { Button } from './Button';

export const STAKE_PRESETS = [50, 100, 200, 400] as const;

export function clampStep(value: number, delta: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value + delta));
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Stepper({ value, min, max, step = 25, onChange, className }: StepperProps) {
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          aria-label="Decrease"
          disabled={value <= min}
          onClick={() => onChange(clampStep(value, -step, min, max))}
        >
          −
        </Button>
        <span className="min-w-16 text-center font-display text-2xl tabular-nums">{value}</span>
        <Button
          type="button"
          variant="secondary"
          aria-label="Increase"
          disabled={value >= max}
          onClick={() => onChange(clampStep(value, step, min, max))}
        >
          +
        </Button>
      </div>
      <div className="flex gap-2">
        {STAKE_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="ghost"
            className="border border-line"
            disabled={preset > max}
            onClick={() => onChange(clampStep(0, preset, min, max))}
          >
            {preset}
          </Button>
        ))}
      </div>
    </div>
  );
}
