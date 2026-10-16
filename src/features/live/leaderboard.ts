import type { EntryScore, Pick as EntryPick, Ranked, ScoredEntry } from '@shared/index.ts';
import { rankEntries } from '@shared/index.ts';

// Pure leaderboard assembly, kept apart from the Firestore listener (docs/tasks/T15).

export interface LeaderboardEntryLike {
  uid: string;
  displayName: string;
  photoURL: string | null;
  status: 'submitted' | 'void';
  picks: Record<string, EntryPick>;
  score: EntryScore | null;
}

export interface LeaderboardRow {
  uid: string;
  displayName: string;
  photoURL: string | null;
  picks: Record<string, EntryPick>;
  score: EntryScore;
}

/** score is null until the event's first result lands; everyone starts tied at 0 (shared/scoring.ts §5). */
const EMPTY_SCORE: EntryScore = { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0 };

/**
 * Ranks submitted entries with shared/scoring.ts's tiebreakers; void entries are dropped.
 * `photoURL` is denormalized onto the entry at submit time, so a picture changed after picks
 * locked would otherwise show stale on fight night; pass live user docs (keyed by uid) to prefer
 * their current `photoURL` instead (docs/tasks/T51). Omit it to fall back to the denormalized copy.
 */
export function buildLeaderboard(
  entries: readonly LeaderboardEntryLike[],
  usersById: Readonly<Record<string, { photoURL: string | null }>> = {},
): Ranked<LeaderboardRow>[] {
  const rows: (LeaderboardRow & ScoredEntry)[] = entries
    .filter((entry) => entry.status !== 'void')
    .map((entry) => ({
      uid: entry.uid,
      displayName: entry.displayName,
      photoURL: usersById[entry.uid]?.photoURL ?? entry.photoURL,
      picks: entry.picks,
      score: entry.score ?? EMPTY_SCORE,
    }));
  return rankEntries(rows);
}
