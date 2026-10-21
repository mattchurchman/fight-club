import { accumulateBadges, computeBadges } from '../badges.ts';
import { h2hId } from '../ids.ts';
import { applyEventToStandings } from '../standings.ts';
import { isSoloNight } from './finalize.ts';
import { isPaid } from './scores.ts';
import type { FinalizeUserWrite } from './finalize.ts';
import type { Payout } from '../payouts.ts';
import type { Ranked } from '../scoring.ts';
import type { H2HDelta, SeasonTotals } from '../standings.ts';
import type { UserStats } from '../types.ts';
import type { ScoredLifecycleEntry } from './scores.ts';
import type { LifecycleBout, LifecycleEntry, LifecycleUser, Millis } from './types.ts';

// docs/tasks/T57 — replays every `final` event through the current rules and returns what each
// player's derived records *should* be, so `jobs/rebuild-records.ts` can overwrite them. Pure.
//
// It trusts the stored entry scores and ranks (it never re-scores a card — that's the lifecycle's
// job) and never looks at tokens: buy-ins and payouts were posted to the ledger at finalize and
// stay exactly as they are, including the refund a solo night already paid back.

/**
 * No ledger row for a player at an event's `finalizedAt`, so their balance then is unknown and the
 * `busted` badge (balance hit 0) can't be judged. Any non-zero value withholds it; -1 is a balance
 * Firestore can never hold, so it can't be mistaken for a real one.
 */
const UNKNOWN_BALANCE = -1;

/** One already-final event, with everything the replay needs and nothing else. */
export interface RebuildEvent {
  id: string;
  name: string;
  startsAt: Millis;
  buyIn: number;
  bouts: Record<string, LifecycleBout>;
  entries: readonly LifecycleEntry[];
  /** Each paid player's ledger `balanceAfter` as of `finalizedAt`; absent = unknown. */
  balanceAfterFinalize: Record<string, number>;
}

/** The roster. Everyone on it gets a record, so a player whose only event was a solo night zeroes out. */
export type RebuildPlayer = Pick<LifecycleUser, 'uid'>;

/** An entry whose stored placing contradicts the current rules (docs/GAME_RULES.md §6.1). */
export interface EntryFix {
  eventId: string;
  uid: string;
  rank: null;
  payout: 0;
}

/** An event that counts for nothing because exactly one player paid in (docs/GAME_RULES.md §6.1). */
export interface SoloNight {
  eventId: string;
  name: string;
  uid: string;
  displayName: string;
}

/** A pair's running head-to-head totals, carrying the `h2h/{id}` document id. */
export interface RebuildH2H extends H2HDelta {
  id: string;
}

/** A paid entry with no stored score or rank: there is nothing to fold in, so it's reported. */
export interface UnsettledEntry {
  eventId: string;
  uid: string;
}

export interface RebuildResult {
  /** Season id (calendar year of `startsAt`, docs/GAME_RULES.md §8) → the rows that replace it. */
  standings: Map<string, SeasonTotals[]>;
  h2h: RebuildH2H[];
  /** One row per roster player, whether or not any event counted for them. */
  users: FinalizeUserWrite[];
  entryFixes: EntryFix[];
  soloNights: SoloNight[];
  unsettled: UnsettledEntry[];
}

function zeroStats(): UserStats {
  return { events: 0, wins: 0, podiums: 0, points: 0, correctWinners: 0 };
}

/** docs/GAME_RULES.md §8: a season is a calendar year, in UTC. */
export function seasonIdFor(startsAt: Millis): string {
  return String(new Date(startsAt).getUTCFullYear());
}

/** The stored entry as the badge and standings maths wants it: already scored and placed. */
function asRanked(entry: LifecycleEntry): Ranked<ScoredLifecycleEntry> {
  return {
    uid: entry.uid,
    displayName: entry.displayName,
    picks: entry.picks,
    submittedAt: entry.submittedAt,
    score: entry.score!,
    rank: entry.rank!,
  };
}

/**
 * Replays `events` — every `final` event, oldest first — and returns the records they add up to.
 *
 * Nothing carries over from what Firestore holds now: standings, head-to-heads, stats, badges and
 * lock streaks all start empty, so the result is the whole truth and the caller overwrites rather
 * than adds. Running it twice over the same input gives the same answer.
 */
export function rebuildRecords(
  events: readonly RebuildEvent[],
  users: readonly RebuildPlayer[],
): RebuildResult {
  const standings = new Map<string, SeasonTotals[]>();
  const h2h = new Map<string, RebuildH2H>();
  const stats = new Map<string, UserStats>();
  const badges = new Map<string, { badges: string[]; badgeCounts: Record<string, number> }>();
  const lockStreaks = new Map<string, number>();
  const entryFixes: EntryFix[] = [];
  const soloNights: SoloNight[] = [];
  const unsettled: UnsettledEntry[] = [];

  for (const event of events) {
    const paid = event.entries.filter(isPaid);

    // §6.1: a lone entrant is a no-contest. The buy-in was refunded at finalize; what's left to
    // undo is the placing, which is why this is the one case that also fixes the entry.
    if (isSoloNight(paid.length)) {
      const solo = paid[0]!;
      soloNights.push({
        eventId: event.id,
        name: event.name,
        uid: solo.uid,
        displayName: solo.displayName,
      });
      entryFixes.push({ eventId: event.id, uid: solo.uid, rank: null, payout: 0 });
      continue;
    }

    const settled = paid.filter((entry) => entry.score !== null && entry.rank !== null);
    for (const entry of paid) {
      if (entry.score === null || entry.rank === null) {
        unsettled.push({ eventId: event.id, uid: entry.uid });
      }
    }

    const ranked = settled.map(asRanked);
    const payouts: Payout[] = settled.map((entry) => ({
      uid: entry.uid,
      amount: entry.payout ?? 0,
    }));

    const seasonId = seasonIdFor(event.startsAt);
    const update = applyEventToStandings(
      standings.get(seasonId) ?? [],
      ranked,
      payouts,
      event.buyIn,
      event.bouts,
    );
    standings.set(seasonId, update.standings);

    for (const delta of update.h2h) {
      const id = h2hId(delta.a, delta.b);
      const current = h2h.get(id);
      h2h.set(id, {
        id,
        a: delta.a,
        b: delta.b,
        aWins: (current?.aWins ?? 0) + delta.aWins,
        bWins: (current?.bWins ?? 0) + delta.bWins,
        ties: (current?.ties ?? 0) + delta.ties,
      });
    }

    for (const entry of ranked) {
      const current = stats.get(entry.uid) ?? zeroStats();
      stats.set(entry.uid, {
        events: current.events + 1,
        wins: current.wins + (entry.rank === 1 ? 1 : 0),
        podiums: current.podiums + (entry.rank <= 3 ? 1 : 0),
        points: current.points + entry.score.total,
        correctWinners: current.correctWinners + entry.score.correctWinners,
      });

      const lockBoutId = settled.find((e) => e.uid === entry.uid)?.lockBoutId ?? '';
      const { badges: earned, lockStreak } = computeBadges(
        entry,
        event.bouts,
        lockBoutId,
        event.balanceAfterFinalize[entry.uid] ?? UNKNOWN_BALANCE,
        lockStreaks.get(entry.uid) ?? 0,
      );
      lockStreaks.set(entry.uid, lockStreak);
      badges.set(entry.uid, accumulateBadges(earned, badges.get(entry.uid) ?? {}));
    }
  }

  const userWrites: FinalizeUserWrite[] = users.map(({ uid }) => ({
    uid,
    stats: stats.get(uid) ?? zeroStats(),
    badges: badges.get(uid)?.badges ?? [],
    badgeCounts: badges.get(uid)?.badgeCounts ?? {},
    lockStreak: lockStreaks.get(uid) ?? 0,
  }));

  return {
    standings,
    h2h: [...h2h.values()],
    users: userWrites,
    entryFixes,
    soloNights,
    unsettled,
  };
}
