import { DEFAULTS } from '../constants.ts';
import { computePayouts } from '../payouts.ts';
import { applyEventToStandings } from '../standings.ts';
import { mainCardBoutIds } from '../validation.ts';
import { accumulateBadges, computeBadges } from '../badges.ts';
import { isPaid, scoreAndRank } from './scores.ts';
import type { Payout } from '../payouts.ts';
import type { Ranked } from '../scoring.ts';
import type { H2HDelta, SeasonTotals } from '../standings.ts';
import type { AppDefaults, EntryScore, UserStats } from '../types.ts';
import type { ScoredLifecycleEntry } from './scores.ts';
import type {
  EventPatch,
  LedgerIntent,
  LifecycleBout,
  LifecycleEntry,
  LifecycleEvent,
  LifecycleUser,
  Millis,
  Plan,
} from './types.ts';

// docs/GAME_RULES.md §5, §6 and §8: the one-way door. Pure — `jobs/lifecycle.ts` applies it, once,
// inside per-player transactions keyed by deterministic ledger ids.

/**
 * docs/GAME_RULES.md §4.6: first blood has no ESPN source, so finalize waits for an admin to enter it.
 * After this long it gives up and scores the prop as void rather than holding the pot hostage.
 */
export const FIRST_BLOOD_GRACE_MS = 12 * 60 * 60 * 1000;

/**
 * docs/GAME_RULES.md §6.1: one paid entrant is a no-contest. The entry is still scored, but it
 * places nowhere and the event counts for nothing. `jobs/rebuild-player-records.ts` (T57) reuses this.
 */
export function isSoloNight(paidCount: number): boolean {
  return paidCount === 1;
}

export type FinalizeBlock = 'already-final' | 'not-in-play' | 'bouts-pending' | 'awaiting-first-blood';

export interface FinalizeEntryWrite {
  uid: string;
  score: EntryScore;
  /** `null` on a solo night: the entry is scored but placed nowhere (docs/GAME_RULES.md §6.1). */
  rank: number | null;
  /** Tokens won. `0` for a charged entry that placed out of the money, and on a solo night. */
  payout: number;
}

/** The four fields every finalize writes on `users/{uid}`, in both appliers. */
export interface FinalizeUserWrite {
  uid: string;
  stats: UserStats;
  /** The full distinct list of badges earned ever, oldest first — write it with a plain `set`. */
  badges: string[];
  /** Times each badge has been earned (docs/GAME_RULES.md §9). */
  badgeCounts: Record<string, number>;
  lockStreak: number;
}

export interface FinalizePlan extends Plan {
  reason: FinalizeBlock | null;
  ranked: Ranked<ScoredLifecycleEntry>[];
  payouts: Payout[];
  /** `payout` rows, or the single `refund` row a lone entrant gets (docs/GAME_RULES.md §6). */
  ledger: LedgerIntent[];
  entries: FinalizeEntryWrite[];
  standings: SeasonTotals[];
  h2h: H2HDelta[];
  users: FinalizeUserWrite[];
  event: EventPatch;
}

function blocked(reason: FinalizeBlock): FinalizePlan {
  return {
    applies: false,
    reason,
    ranked: [],
    payouts: [],
    ledger: [],
    entries: [],
    standings: [],
    h2h: [],
    users: [],
    event: {},
  };
}

const NO_STATS: UserStats = { events: 0, wins: 0, podiums: 0, points: 0, correctWinners: 0 };

/** The most recent result on the card, or `lockAt` when the whole card was cancelled. */
function lastResultAt(event: LifecycleEvent, bouts: Record<string, LifecycleBout>): Millis {
  let latest = event.lockAt;
  for (const boutId of mainCardBoutIds(bouts)) {
    const updatedAt = bouts[boutId]!.result?.updatedAt;
    if (updatedAt !== undefined && updatedAt > latest) {
      latest = updatedAt;
    }
  }
  return latest;
}

/** True once every first-blood pick in play has an answer — `'none'` counts as answered. */
function firstBloodResolved(
  bouts: Record<string, LifecycleBout>,
  entries: readonly LifecycleEntry[],
): boolean {
  return entries.every((entry) => {
    if (!entry.firstBlood) {
      return true;
    }
    const actual = bouts[entry.firstBlood.boutId]?.result?.firstBlood;
    return actual !== null && actual !== undefined;
  });
}

/**
 * Scores the card for the last time, splits the pot, and folds the event into the season.
 *
 * Fires only from `locked`/`live` with every main-card bout `final` or `cancelled`. `prevStandings`
 * is the current `seasons/{seasonId}/standings` — the returned rows replace them, so the caller must
 * pass the real ones or the season totals will regress.
 */
export function planFinalize(
  event: LifecycleEvent,
  bouts: Record<string, LifecycleBout>,
  entries: readonly LifecycleEntry[],
  users: Record<string, LifecycleUser>,
  prevStandings: readonly SeasonTotals[],
  now: Millis,
  cfg: AppDefaults = DEFAULTS,
): FinalizePlan {
  if (event.status === 'final') {
    return blocked('already-final');
  }
  if (event.status !== 'locked' && event.status !== 'live') {
    return blocked('not-in-play');
  }

  const card = mainCardBoutIds(bouts).map((boutId) => bouts[boutId]!);
  const settled = card.every((bout) => bout.status === 'final' || bout.status === 'cancelled');
  if (!settled) {
    return blocked('bouts-pending');
  }

  const paid = entries.filter(isPaid);
  if (
    event.firstBloodEnabled &&
    !firstBloodResolved(bouts, paid) &&
    now - lastResultAt(event, bouts) < FIRST_BLOOD_GRACE_MS
  ) {
    return blocked('awaiting-first-blood');
  }

  const ranked = scoreAndRank(event, bouts, paid, cfg);
  const finalizedEvent: EventPatch = { status: 'final', finalizedAt: now };

  // §6.1: a lone entrant has nobody to beat, so the buy-in comes back instead of being paid out
  // and the night counts for nothing — scored, but unranked, unpaid and absent from every total.
  if (isSoloNight(ranked.length)) {
    const solo = ranked[0]!;
    return {
      applies: true,
      reason: null,
      ranked,
      payouts: [],
      ledger: [
        {
          uid: solo.uid,
          amount: event.buyIn,
          type: 'refund',
          eventId: event.id,
          note: 'sole entrant',
        },
      ],
      entries: [{ uid: solo.uid, score: solo.score, rank: null, payout: 0 }],
      standings: [],
      h2h: [],
      users: [],
      event: finalizedEvent,
    };
  }

  const payouts = computePayouts(ranked, event.buyIn);
  const won = new Map(payouts.map((payout) => [payout.uid, payout.amount]));

  const ledger: LedgerIntent[] = payouts.map((payout) => ({
    uid: payout.uid,
    amount: payout.amount,
    type: 'payout' as const,
    eventId: event.id,
    note: null,
  }));

  const entryWrites: FinalizeEntryWrite[] = ranked.map((entry) => ({
    uid: entry.uid,
    score: entry.score,
    rank: entry.rank,
    payout: won.get(entry.uid) ?? 0,
  }));

  const { standings, h2h } = applyEventToStandings(
    prevStandings,
    ranked,
    payouts,
    event.buyIn,
    bouts,
  );

  const userWrites: FinalizeUserWrite[] = ranked.map((entry) => {
    const user = users[entry.uid];
    const current = user?.stats ?? NO_STATS;
    const payout = won.get(entry.uid) ?? 0;
    const balanceAfterPayout = (user?.balance ?? 0) + payout;
    const lockBoutId = paid.find((e) => e.uid === entry.uid)?.lockBoutId ?? '';

    const { badges: earned, lockStreak } = computeBadges(
      entry,
      bouts,
      lockBoutId,
      balanceAfterPayout,
      user?.lockStreak ?? 0,
    );
    const { badges, badgeCounts } = accumulateBadges(earned, user ?? {});

    return {
      uid: entry.uid,
      stats: {
        events: current.events + 1,
        wins: current.wins + (entry.rank === 1 ? 1 : 0),
        podiums: current.podiums + (entry.rank <= 3 ? 1 : 0),
        points: current.points + entry.score.total,
        correctWinners: current.correctWinners + entry.score.correctWinners,
      },
      badges,
      badgeCounts,
      lockStreak,
    };
  });

  return {
    applies: true,
    reason: null,
    ranked,
    payouts,
    ledger,
    entries: entryWrites,
    standings,
    h2h,
    users: userWrites,
    event: finalizedEvent,
  };
}
