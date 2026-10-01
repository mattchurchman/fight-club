import type { Pick as EntryPick } from '@shared/index.ts';
import { DEFAULT_AMERICAN_ODDS } from '@shared/index.ts';
import type { BoutWithId } from '../events/hooks.ts';

// Pure "best call of the night" selector, kept apart from the Firestore listener (docs/tasks/T22).

export interface CallOfTheNightEntryLike {
  uid: string;
  displayName: string;
  picks: Record<string, EntryPick>;
}

export interface CallOfTheNight {
  displayName: string;
  fighterName: string;
  odds: number;
  boutId: string;
}

/**
 * The correct pick priced at the longest American odds across all resolved bouts — the biggest
 * upset anyone called right. `null` when nothing has a result yet, or no correct pick exists.
 */
export function findCallOfTheNight(
  entries: readonly CallOfTheNightEntryLike[],
  bouts: readonly BoutWithId[],
): CallOfTheNight | null {
  let best: CallOfTheNight | null = null;

  for (const bout of bouts) {
    const winner = bout.result?.winner;
    if (winner !== 'A' && winner !== 'B') continue;
    const fighterName = winner === 'A' ? bout.a.name : bout.b.name;
    const price = (winner === 'A' ? bout.odds.a : bout.odds.b) ?? DEFAULT_AMERICAN_ODDS;

    for (const entry of entries) {
      const pick = entry.picks[bout.id];
      if (!pick || pick.winner !== winner) continue;
      if (best === null || price > best.odds) {
        best = { displayName: entry.displayName, fighterName, odds: price, boutId: bout.id };
      }
    }
  }

  return best;
}
