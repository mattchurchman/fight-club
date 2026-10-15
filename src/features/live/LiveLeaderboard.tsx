import { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Coin } from '../../components/brand/Brand.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { Bout } from '@shared/index.ts';
import type { BoutWithId } from '../events/hooks.ts';
import { fightOrder } from './derive.ts';
import { buildLeaderboard } from './leaderboard.ts';
import type { LeaderboardEntryLike } from './leaderboard.ts';
import { boutPickOutcome } from './reveal.ts';
import type { PickOutcome } from './reveal.ts';

const OUTCOME_MARK: Record<PickOutcome, { glyph: string; className: string }> = {
  correct: { glyph: '✓', className: 'text-win' },
  wrong: { glyph: '✗', className: 'text-muted' },
  push: { glyph: '–', className: 'text-muted' },
  pending: { glyph: '·', className: 'text-muted' },
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** FLIP-animates rows into their new position on reorder; a no-op when motion is reduced. */
function useFlip(orderKey: string) {
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const prevTops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    if (!prefersReducedMotion()) {
      rowRefs.current.forEach((el, uid) => {
        const prevTop = prevTops.current.get(uid);
        if (prevTop == null) return;
        const delta = prevTop - el.getBoundingClientRect().top;
        if (delta === 0) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms ease';
          el.style.transform = '';
        });
      });
    }
    prevTops.current = new Map(
      Array.from(rowRefs.current.entries()).map(([uid, el]) => [uid, el.getBoundingClientRect().top]),
    );
  }, [orderKey]);

  return rowRefs;
}

/** `LeaderboardEntryLike` plus the payout field needed for a final event's extra column. */
export interface LiveLeaderboardEntry extends LeaderboardEntryLike {
  payout: number | null;
}

interface LiveLeaderboardProps {
  entries: LiveLeaderboardEntry[];
  bouts: BoutWithId[];
  /** Per-uid rank change since the last result (`useRankMoves`, docs/tasks/T35). */
  moves: Record<string, number>;
  /** Shows the payout column once the event is final. */
  final: boolean;
  onTap: (uid: string) => void;
}

/** Rank, movement, avatar, name, points and per-fight marks in fight order; your own row is
 * outlined (docs/tasks/T37). Tap a row to see that player's full picks. */
export function LiveLeaderboard({ entries, bouts, moves, final, onTap }: LiveLeaderboardProps) {
  const { user } = useSession();
  const rows = buildLeaderboard(entries);
  const payoutByUid = new Map(entries.map((entry) => [entry.uid, entry.payout]));
  const boutsById: Record<string, Bout> = Object.fromEntries(bouts.map((bout) => [bout.id, bout]));
  const order = fightOrder(boutsById);
  const rowRefs = useFlip(rows.map((row) => row.uid).join(','));

  return (
    <div className="flex flex-col gap-2 px-4">
      {order.length > 0 ? (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-muted">
          <span className="w-6 shrink-0" />
          <span className="w-6 shrink-0" />
          <span className="shrink-0" style={{ width: 36 }} />
          <span className="min-w-0 flex-1" />
          <span className="w-14 shrink-0" />
          <div className="flex shrink-0 items-center gap-1">
            {order.map((boutId, index) => (
              <span key={boutId} className="w-4 text-center">
                F{index + 1}
              </span>
            ))}
          </div>
          {final ? <span className="w-16 shrink-0" /> : null}
        </div>
      ) : null}
      {rows.map((row) => {
        const isMe = row.uid === user?.uid;
        const move = moves[row.uid] ?? 0;
        const payout = payoutByUid.get(row.uid) ?? null;
        const correct = order.filter(
          (boutId) => boutPickOutcome(row.picks[boutId], boutsById[boutId]!) === 'correct',
        ).length;

        return (
          <button
            key={row.uid}
            type="button"
            onClick={() => onTap(row.uid)}
            ref={(el) => {
              if (el) rowRefs.current.set(row.uid, el);
              else rowRefs.current.delete(row.uid);
            }}
            className={clsx(
              'flex w-full items-center gap-3 rounded-card border p-3 text-left',
              isMe ? 'sticky top-0 z-10 border-text bg-surface ring-2 ring-text' : 'border-line bg-surface',
            )}
          >
            <p className="w-6 shrink-0 text-center font-display text-sm text-muted">{row.rank}</p>
            <p
              className={clsx(
                'w-6 shrink-0 text-center text-xs font-semibold',
                move > 0 ? 'text-win' : move < 0 ? 'text-muted' : '',
              )}
            >
              {move > 0 ? `▲${move}` : move < 0 ? `▼${Math.abs(move)}` : ''}
            </p>
            <Avatar name={row.displayName} src={row.photoURL ?? undefined} size={36} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{row.displayName}</p>
            <p
              className={clsx(
                'w-14 shrink-0 text-right font-display text-sm tabular-nums',
                row.score.total >= 0 ? 'text-win' : 'text-loss',
              )}
            >
              {row.score.total >= 0 ? '+' : ''}
              {row.score.total}
            </p>
            <div
              className="flex shrink-0 items-center gap-1"
              aria-label={`${correct} of ${order.length} correct`}
            >
              {order.map((boutId) => {
                const mark = OUTCOME_MARK[boutPickOutcome(row.picks[boutId], boutsById[boutId]!)];
                return (
                  <span
                    key={boutId}
                    aria-hidden="true"
                    className={clsx('w-4 text-center text-sm', mark.className)}
                  >
                    {mark.glyph}
                  </span>
                );
              })}
            </div>
            {final ? (
              <span className="flex w-16 shrink-0 items-center justify-end gap-1 text-right text-sm font-semibold tabular-nums text-text">
                {payout != null ? (
                  <>
                    <Coin className="size-3.5 text-text" />
                    {payout}
                  </>
                ) : (
                  '—'
                )}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
