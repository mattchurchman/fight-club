import type {
  AppDefaults,
  Bout,
  Corner,
  EntryDraft,
  EntryScore,
  EventRules,
  Ranked,
  ResultMethod,
} from '@shared/index.ts';
import { DEFAULTS, mainCardBoutIds, rankEntries, scoreEntry } from '@shared/index.ts';

// Pure Live-tab derivations: fight order, current bout, swing math, rank moves, results feed
// (docs/tasks/T35, docs/DESIGN.md "Live tab"). No UI here.

/** An entry's picks plus its live-scored total, as kept on `Entry` (docs/DATA_MODEL.md). */
export interface LiveEntryLike extends EntryDraft {
  uid: string;
  score: EntryScore | null;
}

const EMPTY_SCORE: EntryScore = { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0 };

/** Main-card bouts in the order they're fought: descending `order`, main event (order 1) last. */
export function fightOrder<Ts>(bouts: Record<string, Bout<Ts>>): string[] {
  return mainCardBoutIds(bouts).reverse();
}

/**
 * The bout "on" right now: the first unresolved, non-cancelled bout in fight order, or `null`
 * once every main-card bout has a result. A bout an admin has marked `live` jumps the queue.
 */
export function currentBout<Ts>(bouts: Record<string, Bout<Ts>>): string | null {
  const open = fightOrder(bouts).filter((id) => {
    const bout = bouts[id]!;
    return bout.result == null && bout.status !== 'cancelled';
  });
  if (open.length === 0) return null;
  return open.find((id) => bouts[id]!.status === 'live') ?? open[0]!;
}

export interface ProjectedEntry {
  uid: string;
  total: number;
  rank: number;
}

/**
 * Re-scores every entry as if `boutId` had gone to `winner` by method `OTHER` (never the
 * method bonus, so this is always an "at least" line, per docs/DESIGN.md) and re-ranks.
 * Clones rather than mutates `bouts`; `updatedAt` is borrowed from the bout's own odds since
 * the caller's `Ts` (e.g. a Firestore `Timestamp`) can't be constructed from scratch here.
 */
export function projectOutcome<Ts>(
  entries: readonly LiveEntryLike[],
  bouts: Record<string, Bout<Ts>>,
  boutId: string,
  winner: Corner,
  rules: EventRules,
  cfg: AppDefaults = DEFAULTS,
): ProjectedEntry[] {
  const bout = bouts[boutId];
  if (!bout) return [];

  const projectedBouts: Record<string, Bout<Ts>> = {
    ...bouts,
    [boutId]: {
      ...bout,
      result: {
        winner,
        method: 'OTHER' as ResultMethod,
        round: null,
        time: null,
        firstBlood: null,
        source: 'manual',
        updatedAt: bout.odds.updatedAt,
      },
    },
  };

  const ranked = rankEntries(
    entries.map((entry) => ({ uid: entry.uid, score: scoreEntry(entry, projectedBouts, rules, cfg) })),
  );
  return ranked.map((entry) => ({ uid: entry.uid, total: entry.score.total, rank: entry.rank }));
}

export interface SwingLine {
  side: Corner;
  fighterName: string;
  self: { rank: number; delta: number } | null;
  newLeader: { uid: string; name: string } | null;
}

function soleLeader(ranked: readonly Ranked<{ uid: string }>[]): string | null {
  const leaders = ranked.filter((entry) => entry.rank === 1);
  return leaders.length === 1 ? leaders[0]!.uid : null;
}

/**
 * Two "if X wins" lines for the current bout (docs/DESIGN.md "Live tab"): the viewer's own
 * rank/point swing, and who takes over first place, if anyone. `self` is `null` for a
 * spectator (`selfUid === null`) or a viewer with no entry in `entries`.
 */
export function swingLines<Ts>(
  entries: readonly LiveEntryLike[],
  bouts: Record<string, Bout<Ts>>,
  boutId: string,
  selfUid: string | null,
  names: Record<string, string>,
  rules: EventRules,
  cfg: AppDefaults = DEFAULTS,
): SwingLine[] {
  const bout = bouts[boutId];
  if (!bout) return [];

  const current = rankEntries(entries.map((entry) => ({ uid: entry.uid, score: entry.score ?? EMPTY_SCORE })));
  const currentByUid = new Map(current.map((entry) => [entry.uid, entry]));
  const currentLeader = soleLeader(current);

  return (['A', 'B'] as const).map((side) => {
    const projected = projectOutcome(entries, bouts, boutId, side, rules, cfg);
    const projectedByUid = new Map(projected.map((entry) => [entry.uid, entry]));

    const selfCurrent = selfUid ? currentByUid.get(selfUid) : undefined;
    const selfProjected = selfUid ? projectedByUid.get(selfUid) : undefined;
    const self =
      selfCurrent && selfProjected
        ? { rank: selfProjected.rank, delta: selfProjected.total - selfCurrent.score.total }
        : null;

    const newLeaderUid = soleLeader(projected);
    const newLeader =
      newLeaderUid && newLeaderUid !== currentLeader
        ? { uid: newLeaderUid, name: names[newLeaderUid] ?? newLeaderUid }
        : null;

    return { side, fighterName: side === 'A' ? bout.a.name : bout.b.name, self, newLeader };
  });
}

/** Per-uid rank change between two rank snapshots; positive = moved up (docs/DESIGN.md). */
export function rankMoves(prev: Record<string, number>, next: Record<string, number>): Record<string, number> {
  const moves: Record<string, number> = {};
  for (const [uid, rank] of Object.entries(next)) {
    const prevRank = prev[uid];
    if (prevRank == null) continue;
    const delta = prevRank - rank;
    if (delta !== 0) moves[uid] = delta;
  }
  return moves;
}

export interface ResultFeedRow {
  boutId: string;
  winnerName: string;
  loserName: string | null;
  method: ResultMethod;
  round: number | null;
  pickedWinner: number;
  total: number;
  selfDelta: number | null;
}

/** Finished main-card bouts, most recently fought first (docs/DESIGN.md "Live tab" RESULTS list). */
export function resultsFeed<Ts>(
  bouts: Record<string, Bout<Ts>>,
  entries: readonly LiveEntryLike[],
  selfUid: string | null,
): ResultFeedRow[] {
  const mostRecentFirst = mainCardBoutIds(bouts);
  const self = selfUid ? entries.find((entry) => entry.uid === selfUid) ?? null : null;

  const rows: ResultFeedRow[] = [];
  for (const boutId of mostRecentFirst) {
    const bout = bouts[boutId]!;
    if (bout.status !== 'final' || !bout.result) continue;
    const { result } = bout;

    let winnerName: string;
    let loserName: string | null;
    let pickedWinner = 0;
    if (result.winner === 'draw' || result.winner === 'nc') {
      winnerName = result.winner === 'draw' ? 'Draw' : 'No Contest';
      loserName = null;
    } else {
      winnerName = result.winner === 'A' ? bout.a.name : bout.b.name;
      loserName = result.winner === 'A' ? bout.b.name : bout.a.name;
      pickedWinner = entries.filter((entry) => entry.picks[boutId]?.winner === result.winner).length;
    }

    rows.push({
      boutId,
      winnerName,
      loserName,
      method: result.method,
      round: result.round,
      pickedWinner,
      total: entries.length,
      selfDelta: self?.score?.byBout[boutId]?.total ?? null,
    });
  }
  return rows;
}
