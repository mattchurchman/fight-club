import type { LifecycleBout } from './lifecycle/types.ts';
import type { Ranked } from './scoring.ts';
import type { ScoredLifecycleEntry } from './lifecycle/scores.ts';

// Badges earned automatically at finalize (docs/GAME_RULES.md §9)

export interface BadgeDefinition {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  champion: {
    id: 'champion',
    emoji: '🏆',
    name: 'Champion',
    description: 'Won an event',
  },
  'perfect-card': {
    id: 'perfect-card',
    emoji: '💯',
    name: 'Perfect Card',
    description: 'All winners correct on a card with 4+ bouts',
  },
  'upset-artist': {
    id: 'upset-artist',
    emoji: '😤',
    name: 'Upset Artist',
    description: 'Correct pick at +200 odds or longer',
  },
  'lock-smith': {
    id: 'lock-smith',
    emoji: '🔒',
    name: 'Lock Smith',
    description: '3 locks correct in a row',
  },
  bleeder: {
    id: 'bleeder',
    emoji: '🩸',
    name: 'Bleeder',
    description: 'First blood correct',
  },
  busted: {
    id: 'busted',
    emoji: '💸',
    name: 'Busted',
    description: 'Balance hit 0',
  },
};

/**
 * Computes newly earned badges for a player at event finalize.
 * Returns only badges earned in THIS event, not lifetime badges.
 *
 * @param entry The scored and ranked entry for this event
 * @param bouts The bouts in the event, keyed by bout ID
 * @param lockBoutId The lock-of-the-night bout for this entry
 * @param currentBalance The balance after payout is applied
 * @param currentLockStreak The player's current lock streak before this event
 * @returns Object with newly earned badges and updated lock streak
 */
export function computeBadges(
  entry: Ranked<ScoredLifecycleEntry>,
  bouts: Record<string, LifecycleBout>,
  lockBoutId: string,
  currentBalance: number,
  currentLockStreak: number = 0,
): { badges: string[]; lockStreak: number } {
  const earned: string[] = [];

  // Champion: rank 1
  if (entry.rank === 1) {
    earned.push('champion');
  }

  const score = entry.score;

  // Perfect card: all winners correct on card with 4+ bouts
  const numMainCardBouts = Object.keys(entry.picks).length;
  if (score.correctWinners === numMainCardBouts && numMainCardBouts >= 4) {
    earned.push('perfect-card');
  }

  // Upset artist: correct pick at +200 or longer (American odds >= 200)
  if (hasUpsetWin(entry, bouts)) {
    earned.push('upset-artist');
  }

  // Bleeder: first blood correct
  if (score.firstBlood > 0) {
    earned.push('bleeder');
  }

  // Lock smith: 3 consecutive locks correct
  // Update lock streak first
  const lockBout = bouts[lockBoutId];
  const lockWon = lockBout && isLockCorrect(entry, lockBoutId);
  let newLockStreak = 0;
  if (lockWon) {
    newLockStreak = (currentLockStreak || 0) + 1;
    if (newLockStreak >= 3) {
      earned.push('lock-smith');
    }
  }

  // Busted: balance hit 0
  if (currentBalance === 0) {
    earned.push('busted');
  }

  return { badges: earned, lockStreak: newLockStreak };
}

/** Check if the lock bout was scored correctly (winner is correct). */
function isLockCorrect(entry: Ranked<ScoredLifecycleEntry>, lockBoutId: string): boolean {
  const lockScore = entry.score.byBout[lockBoutId];
  if (!lockScore) {
    return false;
  }
  // Lock is correct if base > 0 (winner was correct)
  // or if it was a draw/nc/cancelled (lock penalty = 0, which means base = stake)
  return lockScore.base > 0 || lockScore.lock === 0;
}

/** Check if entry has a correct pick at +200 odds or longer. */
function hasUpsetWin(entry: Ranked<ScoredLifecycleEntry>, bouts: Record<string, LifecycleBout>): boolean {
  for (const boutId in entry.picks) {
    const pick = entry.picks[boutId]!;
    const bout = bouts[boutId];
    if (!bout) {
      continue;
    }

    // Get the odds for the picked corner
    const oddsValue = pick.winner === 'A' ? bout.odds?.a : bout.odds?.b;
    if (oddsValue === null || oddsValue === undefined) {
      continue;
    }

    // Check if odds are +200 or longer (underdog)
    if (oddsValue >= 200) {
      // Check if winner was correct via the score
      const boutScore = entry.score.byBout[boutId];
      if (boutScore && boutScore.base > 0) {
        // base > 0 means winner was correct
        return true;
      }
    }
  }

  return false;
}

/**
 * Folds the badges earned at this finalize into the player's lifetime tallies (docs/GAME_RULES.md §9).
 *
 * `badgeCounts` is the source of truth when it is there. A legacy player who only has the distinct
 * `badges` array counts as one of each, so their first win after this ships reads `champion: 2`
 * rather than resetting them to 1. `badges` comes back as the full distinct list, oldest first, so
 * a plain `set` can replace what `arrayUnion` used to append to.
 */
export function accumulateBadges(
  earned: readonly string[],
  user: { badges?: readonly string[]; badgeCounts?: Record<string, number> } = {},
): { badges: string[]; badgeCounts: Record<string, number> } {
  const badgeCounts: Record<string, number> = {};
  const badges: string[] = [];
  const put = (id: string, count: number): void => {
    if (!(id in badgeCounts)) {
      badges.push(id);
    }
    badgeCounts[id] = count;
  };

  for (const id of user.badges ?? []) put(id, 1);
  for (const [id, count] of Object.entries(user.badgeCounts ?? {})) put(id, count);
  for (const id of earned) put(id, (badgeCounts[id] ?? 0) + 1);

  return { badges, badgeCounts };
}
