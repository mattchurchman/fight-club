import { DEFAULTS } from '../constants.ts';
import { computePayouts } from '../payouts.ts';
import { applyEventToStandings } from '../standings.ts';
import { mainCardBoutIds } from '../validation.ts';
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

export type FinalizeBlock = 'already-final' | 'not-in-play' | 'bouts-pending' | 'awaiting-first-blood';

export interface FinalizeEntryWrite {
  uid: string;
  score: EntryScore;
  rank: number;
  /** Tokens won. `0` for a charged entry that placed out of the money. */
  payout: number;
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
  users: { uid: string; stats: UserStats }[];
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
  const payouts = computePayouts(ranked, event.buyIn);
  const won = new Map(payouts.map((payout) => [payout.uid, payout.amount]));

  // §6: a lone entrant has nobody to beat, so the buy-in comes back instead of being paid out.
  const ledger: LedgerIntent[] =
    ranked.length === 1
      ? [
          {
            uid: ranked[0]!.uid,
            amount: event.buyIn,
            type: 'refund',
            eventId: event.id,
            note: 'sole entrant',
          },
        ]
      : payouts.map((payout) => ({
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

  const userStats = ranked.map((entry) => {
    const current = users[entry.uid]?.stats ?? NO_STATS;
    return {
      uid: entry.uid,
      stats: {
        events: current.events + 1,
        wins: current.wins + (entry.rank === 1 ? 1 : 0),
        podiums: current.podiums + (entry.rank <= 3 ? 1 : 0),
        points: current.points + entry.score.total,
        correctWinners: current.correctWinners + entry.score.correctWinners,
      },
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
    users: userStats,
    event: { status: 'final', finalizedAt: now },
  };
}
