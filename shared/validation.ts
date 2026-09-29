import { DEFAULTS } from './constants.ts';
import type { AppDefaults, Bout, FirstBloodPick, Pick } from './types.ts';

// Implements docs/GAME_RULES.md §3. Pure: no clock, no I/O, config is passed in.

export type ValidationCode =
  | 'NO_ACTIVE_BOUTS'
  | 'MISSING_PICK'
  | 'UNKNOWN_BOUT'
  | 'WINNER_INVALID'
  | 'METHOD_INVALID'
  | 'STAKE_RANGE'
  | 'STAKE_STEP'
  | 'BUDGET_MISMATCH'
  | 'LOCK_REQUIRED'
  | 'LOCK_INVALID'
  | 'FIRST_BLOOD_REQUIRED'
  | 'FIRST_BLOOD_INVALID';

export interface ValidationError {
  code: ValidationCode;
  /** Shown to the player as-is. */
  message: string;
  /** Present when the error belongs to one bout rather than the whole entry. */
  boutId?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

/** The picks half of an `Entry` — what the pick builder holds before submission. An `Entry` satisfies it. */
export interface EntryDraft {
  picks: Record<string, Pick>;
  lockBoutId: string | null;
  firstBlood: FirstBloodPick | null;
}

/** The event fields the rules engine reads. An `Event` satisfies it. */
export interface EventRules {
  budget: number;
  firstBloodEnabled: boolean;
}

const WINNERS: readonly string[] = ['A', 'B'];
const METHODS: readonly string[] = ['KO', 'SUB', 'DEC'];

function boutIdsWhere<Ts>(
  bouts: Record<string, Bout<Ts>>,
  keep: (bout: Bout<Ts>) => boolean,
): string[] {
  return Object.entries(bouts)
    .filter(([, bout]) => keep(bout))
    .sort(([idA, a], [idB, b]) => a.order - b.order || idA.localeCompare(idB))
    .map(([id]) => id);
}

/** Main-card bouts in fight order, cancellations included — everything an entry can score. */
export function mainCardBoutIds<Ts>(bouts: Record<string, Bout<Ts>>): string[] {
  return boutIdsWhere(bouts, (bout) => bout.isMainCard);
}

/** Main-card bouts that are still on, in fight order — everything an entry must pick. */
export function activeBoutIds<Ts>(bouts: Record<string, Bout<Ts>>): string[] {
  return boutIdsWhere(bouts, (bout) => bout.isMainCard && bout.status !== 'cancelled');
}

/**
 * docs/GAME_RULES.md §3: the budget is clamped so it is always spendable — down to
 * `activeBouts × maxStake` on a short card, up to `activeBouts × minStake` on a long one.
 */
export function computeBudget(activeBoutCount: number, defaults: AppDefaults = DEFAULTS): number {
  const n = Math.max(0, Math.trunc(activeBoutCount));
  return Math.min(Math.max(defaults.budget, n * defaults.minStake), n * defaults.maxStake);
}

export function validateEntry<Ts>(
  entry: EntryDraft,
  bouts: Record<string, Bout<Ts>>,
  event: EventRules,
  cfg: AppDefaults = DEFAULTS,
): ValidationResult {
  const errors: ValidationError[] = [];
  const active = activeBoutIds(bouts);
  const activeSet = new Set(active);

  if (active.length === 0) {
    errors.push({
      code: 'NO_ACTIVE_BOUTS',
      message: 'There are no bouts left on this card to pick.',
    });
    return { ok: false, errors };
  }

  const budget = computeBudget(active.length, { ...cfg, budget: event.budget });
  let staked = 0;

  for (const boutId of active) {
    const pick = entry.picks[boutId];
    if (!pick) {
      errors.push({
        boutId,
        code: 'MISSING_PICK',
        message: 'Pick a winner, a method and a stake.',
      });
      continue;
    }
    if (!WINNERS.includes(pick.winner)) {
      errors.push({ boutId, code: 'WINNER_INVALID', message: 'Pick one of the two fighters.' });
    }
    if (!METHODS.includes(pick.method)) {
      errors.push({ boutId, code: 'METHOD_INVALID', message: 'Pick a method: KO, SUB or DEC.' });
    }
    if (!Number.isFinite(pick.stake) || pick.stake < cfg.minStake || pick.stake > cfg.maxStake) {
      errors.push({
        boutId,
        code: 'STAKE_RANGE',
        message: `Stake between ${cfg.minStake} and ${cfg.maxStake} points.`,
      });
    } else if (!Number.isInteger(pick.stake) || pick.stake % cfg.stakeStep !== 0) {
      errors.push({
        boutId,
        code: 'STAKE_STEP',
        message: `Stake must be a multiple of ${cfg.stakeStep} points.`,
      });
    }
    if (Number.isFinite(pick.stake)) {
      staked += pick.stake;
    }
  }

  // A bout cancelled after submission keeps its pick (§3); a pick on a prelim or a
  // bout that was never on this card is junk from a stale client.
  for (const boutId of Object.keys(entry.picks)) {
    const bout = bouts[boutId];
    if (!bout || !bout.isMainCard) {
      errors.push({ boutId, code: 'UNKNOWN_BOUT', message: 'That bout is not on this main card.' });
    }
  }

  if (staked !== budget) {
    errors.push({
      code: 'BUDGET_MISMATCH',
      message: `Stake exactly ${budget} points — you have staked ${staked}.`,
    });
  }

  if (!entry.lockBoutId) {
    errors.push({ code: 'LOCK_REQUIRED', message: 'Choose one bout as your Lock of the Night.' });
  } else if (!activeSet.has(entry.lockBoutId) || !entry.picks[entry.lockBoutId]) {
    errors.push({
      boutId: entry.lockBoutId,
      code: 'LOCK_INVALID',
      message: 'Your Lock must be a bout that is still on the card and picked.',
    });
  }

  if (event.firstBloodEnabled) {
    const firstBlood = entry.firstBlood;
    if (!firstBlood) {
      errors.push({ code: 'FIRST_BLOOD_REQUIRED', message: 'Pick who draws first blood.' });
    } else if (!activeSet.has(firstBlood.boutId) || !WINNERS.includes(firstBlood.fighter)) {
      errors.push({
        boutId: firstBlood.boutId,
        code: 'FIRST_BLOOD_INVALID',
        message: 'Pick a fighter from a bout that is still on the card.',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
