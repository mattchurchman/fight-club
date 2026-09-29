import { DEFAULT_AMERICAN_ODDS } from './scoring.ts';
import type { Payout } from './payouts.ts';
import type { ScoredEntry } from './scoring.ts';
import type { Bout, Pick, Standing } from './types.ts';

// Implements docs/GAME_RULES.md §8. Pure: no clock, no I/O — the caller stamps `updatedAt`.

/** docs/GAME_RULES.md §9 (`upset-artist`): a correct pick priced at +200 or longer. */
export const UPSET_AMERICAN_ODDS = 200;

/** A season row without its `updatedAt`, which only the writing job can set. */
export type SeasonTotals = Omit<Standing, 'updatedAt'>;

/** A finalised, ranked entry. A scored `Entry` plus its rank satisfies it. */
export interface StandingsEntry extends ScoredEntry {
  rank: number;
  displayName: string;
  picks: Record<string, Pick>;
}

export interface H2HDelta {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  ties: number;
}

export interface StandingsUpdate {
  standings: SeasonTotals[];
  h2h: H2HDelta[];
}

/** Correct picks on a fighter priced at +200 or longer. Pushes and unresolved bouts don't count. */
export function countUpsets<Ts>(
  picks: Record<string, Pick>,
  bouts: Record<string, Bout<Ts>>,
): number {
  let upsets = 0;
  for (const [boutId, pick] of Object.entries(picks)) {
    const bout = bouts[boutId];
    if (!bout || bout.status === 'cancelled' || bout.result?.winner !== pick.winner) {
      continue;
    }
    const price = (pick.winner === 'A' ? bout.odds.a : bout.odds.b) ?? DEFAULT_AMERICAN_ODDS;
    if (price >= UPSET_AMERICAN_ODDS) {
      upsets += 1;
    }
  }
  return upsets;
}

/**
 * One row per pair of entrants, saying who scored higher. `a`/`b` are the two uids sorted,
 * matching the order-independent id from `h2hId`.
 */
export function h2hDeltas(entries: readonly StandingsEntry[]): H2HDelta[] {
  const deltas: H2HDelta[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const left = entries[i]!;
      const right = entries[j]!;
      const [a, b] = left.uid < right.uid ? [left, right] : [right, left];
      deltas.push({
        a: a.uid,
        b: b.uid,
        aWins: a.score.total > b.score.total ? 1 : 0,
        bWins: b.score.total > a.score.total ? 1 : 0,
        ties: a.score.total === b.score.total ? 1 : 0,
      });
    }
  }
  return deltas;
}

function blankTotals(uid: string, displayName: string): SeasonTotals {
  return {
    uid,
    displayName,
    points: 0,
    events: 0,
    wins: 0,
    podiums: 0,
    netTokens: 0,
    correctWinners: 0,
    upsets: 0,
  };
}

/**
 * Folds one finalised event into the season standings. `entries` must hold only the charged
 * entries, ranked; `payouts` is what `computePayouts` returned. Rows in `prev` for players who
 * sat the event out are passed through untouched, and nothing given is mutated.
 */
export function applyEventToStandings<Ts>(
  prev: readonly SeasonTotals[],
  entries: readonly StandingsEntry[],
  payouts: readonly Payout[],
  buyIn: number,
  bouts: Record<string, Bout<Ts>>,
): StandingsUpdate {
  const won = new Map(payouts.map((payout) => [payout.uid, payout.amount]));
  const rows = new Map(prev.map((row) => [row.uid, { ...row }]));

  for (const entry of entries) {
    const current = rows.get(entry.uid) ?? blankTotals(entry.uid, entry.displayName);
    rows.set(entry.uid, {
      uid: entry.uid,
      displayName: entry.displayName,
      points: current.points + entry.score.total,
      events: current.events + 1,
      wins: current.wins + (entry.rank === 1 ? 1 : 0),
      podiums: current.podiums + (entry.rank <= 3 ? 1 : 0),
      netTokens: current.netTokens + (won.get(entry.uid) ?? 0) - buyIn,
      correctWinners: current.correctWinners + entry.score.correctWinners,
      upsets: current.upsets + countUpsets(entry.picks, bouts),
    });
  }

  return { standings: [...rows.values()], h2h: h2hDeltas(entries) };
}
