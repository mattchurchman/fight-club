import type { AppDefaults } from './types.ts';

// docs/GAME_RULES.md is the contract; this file is the only place these numbers live.
export const RULES_VERSION = 'v2.0';

// Mirrors config/app.defaults exactly (docs/DATA_MODEL.md).
export const DEFAULTS: AppDefaults = {
  buyIn: 100,
  startingGrant: 500,
  budget: 1000,
  minStake: 50,
  maxStake: 400,
  stakeStep: 25,
  methodMultipliers: { KO: 0.75, SUB: 1, DEC: 0.5 },
  lockPenaltyPct: 0.5,
  firstBloodBonus: 100,
};

// docs/GAME_RULES.md §6: split by number of paid entrants.
export const PAYOUT_TABLE: ReadonlyArray<{ min: number; max: number; splits: readonly number[] }> = [
  { min: 1, max: 1, splits: [] }, // refund, no winner
  { min: 2, max: 3, splits: [1] },
  { min: 4, max: 6, splits: [0.7, 0.3] },
  { min: 7, max: Infinity, splits: [0.6, 0.3, 0.1] },
];

// docs/DATA_SOURCES.md §3: matches `shortName`, not `name` — e.g. "UFC 332", not "UFC Freedom 250".
export const NUMBERED_EVENT_RE = /^UFC (\d{3,4})$/;
