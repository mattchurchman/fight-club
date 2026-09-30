import { clampStep } from '../../components/ui/Stepper.tsx';

interface StakeCfg {
  minStake: number;
  maxStake: number;
  stakeStep: number;
}

/**
 * Spreads `totalPoints` evenly across `boutIds` in steps of `stakeStep`, clamped per bout
 * to `[minStake, maxStake]`. Any leftover from flooring the even split goes to the first
 * bouts in the given order (docs/tasks/T14 §1 "spread the remaining points evenly").
 */
export function distributeStakes(
  boutIds: readonly string[],
  totalPoints: number,
  cfg: StakeCfg,
): Record<string, number> {
  const result: Record<string, number> = {};
  if (boutIds.length === 0) return result;

  const totalSteps = Math.max(0, Math.round(totalPoints / cfg.stakeStep));
  const baseSteps = Math.floor(totalSteps / boutIds.length);
  let extraSteps = totalSteps - baseSteps * boutIds.length;

  for (const boutId of boutIds) {
    let steps = baseSteps;
    if (extraSteps > 0) {
      steps += 1;
      extraSteps -= 1;
    }
    result[boutId] = clampStep(0, steps * cfg.stakeStep, cfg.minStake, cfg.maxStake);
  }
  return result;
}
