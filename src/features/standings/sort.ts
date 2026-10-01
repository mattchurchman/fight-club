import type { Standing } from '@shared/index.ts';

// docs/GAME_RULES.md §8: "Ordered by points." Kept apart from the Firestore listener (docs/tasks/T21).

/** Points, then wins, then podiums, then name — so a fresh season with everyone at 0 is still stable. */
export function sortStandings<T extends Pick<Standing, 'points' | 'wins' | 'podiums' | 'displayName'>>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.podiums - a.podiums ||
      a.displayName.localeCompare(b.displayName),
  );
}
