// The ordered fight-night script `jobs/simulate-night.ts` plays out against the emulators
// (docs/tasks/T49). Pure — no Firestore/Admin imports — so it's unit-testable on its own; see
// `sim-script.test.ts`.
import type { EntryDraft, Method, Pick, ResultMethod, Winner } from '@shared/index.ts';

export interface ScriptedResult {
  odds: { a: number; b: number };
  winner: Winner;
  method: ResultMethod;
  round: number;
  time: string;
  firstBlood: 'A' | 'B' | 'none';
}

/**
 * Keyed by `Bout.order` (1 = main event). The card fights in the opposite direction — 5 goes on
 * first, 1 goes on last — see `fightNightOrder`. Includes at least one decision and one clear
 * underdog win (odds >= `UPSET_AMERICAN_ODDS`, shared/standings.ts), and the main event closes on
 * a 5-round decision.
 */
const RESULTS_BY_ORDER: Readonly<Record<number, ScriptedResult>> = {
  5: { odds: { a: -300, b: 250 }, winner: 'B', method: 'DEC', round: 3, time: '5:00', firstBlood: 'A' },
  4: { odds: { a: -180, b: 150 }, winner: 'A', method: 'SUB', round: 2, time: '3:41', firstBlood: 'B' },
  3: { odds: { a: 120, b: -140 }, winner: 'A', method: 'KO', round: 1, time: '2:14', firstBlood: 'A' },
  2: { odds: { a: -250, b: 210 }, winner: 'B', method: 'KO', round: 2, time: '4:02', firstBlood: 'B' },
  1: { odds: { a: -150, b: 130 }, winner: 'A', method: 'DEC', round: 5, time: '5:00', firstBlood: 'none' },
};

/** Fight order: undercard first, the main event (`order` 1) last — the reverse of `Bout.order`. */
export function fightNightOrder<T extends { order: number }>(bouts: readonly T[]): T[] {
  return [...bouts].sort((a, b) => b.order - a.order);
}

/**
 * The scripted result for one main-card bout, keyed by its `order`. Throws if the script doesn't
 * cover that order, or if its round doesn't fit the bout's actual round count — both mean the card
 * this ran against isn't the 5-bout card the script was written for.
 */
export function scriptedResult(order: number, rounds: 3 | 5): ScriptedResult {
  const result = RESULTS_BY_ORDER[order];
  if (!result) throw new Error(`sim-script has no scripted result for bout order ${order}`);
  if (result.round > rounds) {
    throw new Error(`sim-script round ${result.round} doesn't fit a ${rounds}-round bout (order ${order})`);
  }
  return result;
}

/** Every order the script covers, ascending — the main-card size this script was written for. */
export const SIM_CARD_ORDERS: readonly number[] = Object.keys(RESULTS_BY_ORDER)
  .map(Number)
  .sort((a, b) => a - b);

const METHODS: readonly Method[] = ['KO', 'SUB', 'DEC'];
/** 5 main-card bouts × 200 == `DEFAULTS.budget` (shared/constants.ts), so every entry spends exactly it. */
const STAKE = 200;

/**
 * A deterministic, valid entry for the `friendIndex`-th friend (0-based) — varied enough that the
 * leaderboard isn't a tie, and always spending exactly the budget. `bouts` must be every main-card
 * bout, in `Bout.order` order (ascending) — same as `mainCardBoutIds`.
 */
export function buildFriendEntry(
  friendIndex: number,
  bouts: readonly { boutId: string }[],
): EntryDraft {
  const picks: Record<string, Pick> = {};
  bouts.forEach(({ boutId }, i) => {
    picks[boutId] = {
      winner: (friendIndex + i) % 2 === 0 ? 'A' : 'B',
      method: METHODS[(friendIndex * 2 + i) % METHODS.length]!,
      stake: STAKE,
    };
  });
  return {
    picks,
    lockBoutId: bouts[friendIndex % bouts.length]!.boutId,
    firstBlood: {
      boutId: bouts[(friendIndex + 1) % bouts.length]!.boutId,
      fighter: friendIndex % 2 === 0 ? 'A' : 'B',
    },
  };
}
