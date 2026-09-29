import { DEFAULTS } from './constants.ts';
import { americanToDecimal } from './odds.ts';
import { mainCardBoutIds } from './validation.ts';
import type { EntryDraft, EventRules } from './validation.ts';
import type { AppDefaults, Bout, BoutScore, EntryScore, Pick } from './types.ts';

// Implements docs/GAME_RULES.md §4–§5. Pure: no clock, no I/O, config is passed in.

/** docs/GAME_RULES.md §4: a side with no price frozen at lock is scored as even money. */
export const DEFAULT_AMERICAN_ODDS = 100;

/** A cancelled bout, a draw and a no contest all refund the stake and nothing else (§4.4). */
function push(stake: number): BoutScore {
  return { base: stake, method: 0, lock: 0, total: stake };
}

/**
 * Scores one bout, or `null` while it is still pending. `isLock` is true only for the
 * entry's `lockBoutId`. Rounding is `Math.round` per component; the lock penalty is
 * rounded as a positive magnitude and then negated (§ preamble).
 */
export function scoreBout<Ts>(
  pick: Pick,
  bout: Bout<Ts>,
  isLock: boolean,
  cfg: AppDefaults = DEFAULTS,
): BoutScore | null {
  if (bout.status === 'cancelled') {
    return push(pick.stake);
  }

  const result = bout.result;
  if (!result) {
    return null;
  }
  if (result.winner === 'draw' || result.winner === 'nc') {
    return push(pick.stake);
  }

  if (result.winner !== pick.winner) {
    const lock = isLock ? -Math.round(pick.stake * cfg.lockPenaltyPct) : 0;
    return { base: 0, method: 0, lock, total: lock };
  }

  const price = (pick.winner === 'A' ? bout.odds.a : bout.odds.b) ?? DEFAULT_AMERICAN_ODDS;
  const base = Math.round(pick.stake * americanToDecimal(price));
  // A result method of DQ or OTHER can never equal a picked KO/SUB/DEC, so §4.3 holds by construction.
  const method =
    result.method === pick.method ? Math.round(pick.stake * cfg.methodMultipliers[pick.method]) : 0;
  const lock = isLock ? base : 0;
  return { base, method, lock, total: base + method + lock };
}

/**
 * docs/GAME_RULES.md §4.6: the entry-level First Blood prop. Independent of who won.
 * Void — worth 0 — when the prop is off, unpicked, unresolved, or came back `'none'`.
 */
export function scoreFirstBlood<Ts>(
  entry: EntryDraft,
  bouts: Record<string, Bout<Ts>>,
  event: EventRules,
  cfg: AppDefaults = DEFAULTS,
): number {
  if (!event.firstBloodEnabled || !entry.firstBlood) {
    return 0;
  }
  // `'none'`, `null` and a missing bout all fall through to 0 — the prop is void, not lost.
  const actual = bouts[entry.firstBlood.boutId]?.result?.firstBlood;
  return actual === entry.firstBlood.fighter ? cfg.firstBloodBonus : 0;
}

export function scoreEntry<Ts>(
  entry: EntryDraft,
  bouts: Record<string, Bout<Ts>>,
  event: EventRules,
  cfg: AppDefaults = DEFAULTS,
): EntryScore {
  const byBout: Record<string, BoutScore | null> = {};
  let total = 0;
  let correctWinners = 0;
  let correctMethods = 0;

  for (const boutId of mainCardBoutIds(bouts)) {
    const pick = entry.picks[boutId];
    const bout = bouts[boutId];
    if (!pick || !bout) {
      continue;
    }

    const scored = scoreBout(pick, bout, boutId === entry.lockBoutId, cfg);
    byBout[boutId] = scored;
    if (!scored) {
      continue;
    }
    total += scored.total;

    // A push is not a correct pick, so cancelled bouts never feed the tiebreakers.
    const result = bout.result;
    if (bout.status !== 'cancelled' && result && result.winner === pick.winner) {
      correctWinners += 1;
      if (result.method === pick.method) {
        correctMethods += 1;
      }
    }
  }

  const firstBlood = scoreFirstBlood(entry, bouts, event, cfg);
  return { total: total + firstBlood, byBout, firstBlood, correctWinners, correctMethods };
}

/** The minimum a ranked entry must carry. `submittedAt` is epoch millis; see `computePayouts`. */
export interface ScoredEntry {
  uid: string;
  score: EntryScore;
  submittedAt?: number;
}

export type Ranked<T> = T & { rank: number };

/** docs/GAME_RULES.md §5: total, then correct winners, then correct methods. */
function compare(a: ScoredEntry, b: ScoredEntry): number {
  return (
    b.score.total - a.score.total ||
    b.score.correctWinners - a.score.correctWinners ||
    b.score.correctMethods - a.score.correctMethods
  );
}

/**
 * Ranks entries, sharing a rank between entries that are still tied after every tiebreaker
 * (so ranks run 1, 2, 2, 4). Generic, so callers get their own entry objects back.
 */
export function rankEntries<T extends ScoredEntry>(entries: readonly T[]): Ranked<T>[] {
  const sorted = [...entries].sort(compare);
  const ranked: Ranked<T>[] = [];
  sorted.forEach((entry, index) => {
    const previous = index > 0 ? sorted[index - 1] : undefined;
    const sharesRank = previous !== undefined && compare(previous, entry) === 0;
    ranked.push({ ...entry, rank: sharesRank ? ranked[index - 1]!.rank : index + 1 });
  });
  return ranked;
}
