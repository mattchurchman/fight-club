import { Chip } from '../../components/ui/Chip.tsx';

export const STAKE_PRESETS = [50, 100, 150, 200, 300, 400] as const;

function clampStake(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The deck's stake rules (docs/tasks/T32 §2): no default — `undefined` reads as "—" — and `+`
 * from `undefined` starts at `min` rather than `min + step`. Exported so the clamp/undefined
 * rules can be unit tested without rendering.
 */
export function stepStake(
  value: number | undefined,
  delta: number,
  min: number,
  max: number,
): number {
  if (value === undefined) return min;
  return clampStake(value + delta, min, max);
}

interface StakePickerProps {
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/** Preset chips + fine −/+ stepper, replacing `Stepper` in the pick deck (docs/tasks/T32 §2). */
export function StakePicker({ value, min, max, step, onChange }: StakePickerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Decrease stake"
          disabled={value === undefined || value <= min}
          onClick={() => onChange(stepStake(value, -step, min, max))}
          className="flex size-11 items-center justify-center rounded-chip border border-line text-xl text-text transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-16 text-center font-display text-2xl tabular-nums text-text">
          {value ?? '—'}
        </span>
        <button
          type="button"
          aria-label="Increase stake"
          disabled={value !== undefined && value >= max}
          onClick={() => onChange(stepStake(value, step, min, max))}
          className="flex size-11 items-center justify-center rounded-chip border border-line text-xl text-text transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STAKE_PRESETS.map((preset) => (
          <Chip
            key={preset}
            selected={value === preset}
            disabled={preset < min || preset > max}
            onSelect={() => onChange(clampStake(preset, min, max))}
          >
            {preset}
          </Chip>
        ))}
      </div>
    </div>
  );
}
