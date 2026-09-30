import type { Bout, Corner } from '@shared/index.ts';
import { impliedProbability } from '@shared/index.ts';

// Pure per-bout reveal logic: consensus and contrarian detection (docs/tasks/T15).

export interface RevealEntryLike {
  uid: string;
  displayName: string;
  photoURL: string | null;
  lockBoutId: string;
  picks: Record<string, { winner: Corner }>;
}

export interface BoutConsensus {
  aCount: number;
  bCount: number;
  /** Rounded 0-100; both 0 when nobody has picked this bout yet. */
  aPct: number;
  bPct: number;
}

export function computeConsensus(entries: readonly RevealEntryLike[], boutId: string): BoutConsensus {
  let aCount = 0;
  let bCount = 0;
  for (const entry of entries) {
    const pick = entry.picks[boutId];
    if (!pick) continue;
    if (pick.winner === 'A') aCount += 1;
    else bCount += 1;
  }
  const total = aCount + bCount;
  const aPct = total === 0 ? 0 : Math.round((aCount / total) * 100);
  return { aCount, bCount, aPct, bPct: total === 0 ? 0 : 100 - aPct };
}

export interface Contrarian {
  entry: RevealEntryLike;
  side: Corner;
}

/**
 * The lone dissenter on a bout, when everyone else agrees. `null` when there's no pick,
 * an even split, or fewer than 3 pickers (nothing to be contrarian against).
 */
export function findContrarian(entries: readonly RevealEntryLike[], boutId: string): Contrarian | null {
  const aPickers = entries.filter((entry) => entry.picks[boutId]?.winner === 'A');
  const bPickers = entries.filter((entry) => entry.picks[boutId]?.winner === 'B');
  if (aPickers.length === 1 && bPickers.length >= 2) return { entry: aPickers[0]!, side: 'A' };
  if (bPickers.length === 1 && aPickers.length >= 2) return { entry: bPickers[0]!, side: 'B' };
  return null;
}

/** "Only Matt took the dog" when the lone pick is the underdog by implied probability, else names the fighter. */
export function contrarianLabel(
  contrarian: Contrarian,
  bout: Pick<Bout, 'a' | 'b' | 'odds'>,
): string {
  const { a, b, odds } = bout;
  const fighterName = contrarian.side === 'A' ? a.name : b.name;
  if (odds.a != null && odds.b != null) {
    const dogSide: Corner = impliedProbability(odds.a) <= impliedProbability(odds.b) ? 'A' : 'B';
    if (contrarian.side === dogSide) {
      return `Only ${contrarian.entry.displayName} took the dog`;
    }
  }
  return `Only ${contrarian.entry.displayName} took ${fighterName}`;
}

export type PickOutcome = 'pending' | 'push' | 'correct' | 'wrong';

/** Win/loss/push/pending for one player's pick on one bout — display only, mirrors shared/scoring.ts's cases. */
export function boutPickOutcome<Ts>(pick: { winner: Corner } | undefined, bout: Bout<Ts>): PickOutcome {
  if (!pick) return 'pending';
  if (bout.status === 'cancelled') return 'push';
  const { result } = bout;
  if (!result) return 'pending';
  if (result.winner === 'draw' || result.winner === 'nc') return 'push';
  return result.winner === pick.winner ? 'correct' : 'wrong';
}
