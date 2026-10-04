import { useLayoutEffect, useRef } from 'react';
import clsx from 'clsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import { buildLeaderboard } from './leaderboard.ts';
import type { LeaderboardEntryLike } from './leaderboard.ts';
import { boutPickOutcome } from './reveal.ts';

const OUTCOME_DOT: Record<string, string> = {
  correct: 'bg-win',
  wrong: 'bg-loss',
  push: 'bg-muted',
  pending: 'bg-line',
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

interface LiveLeaderboardProps {
  entries: LeaderboardEntryLike[];
  bouts: BoutWithId[];
  onTap: (uid: string) => void;
}

/** Rank, avatar, name, points and per-bout result dots; your own row is pinned and highlighted
 * (docs/tasks/T15). Tap a row to see that player's full picks — picks are already revealed to
 * everyone once the event locks, so there's nothing left to keep secret. */
export function LiveLeaderboard({ entries, bouts, onTap }: LiveLeaderboardProps) {
  const { user } = useSession();
  const rows = buildLeaderboard(entries);
  const mainCard = bouts.filter((bout) => bout.isMainCard);
  const rowRefs = useFlip(rows.map((row) => row.uid).join(','));

  return (
    <div className="flex flex-col gap-2 px-4">
      {rows.map((row) => {
        const isMe = row.uid === user?.uid;
        const correct = mainCard.filter(
          (bout) => boutPickOutcome(row.picks[bout.id], bout) === 'correct',
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
              isMe ? 'sticky top-0 z-10 border-gold bg-gold/10' : 'border-line bg-surface',
            )}
          >
            <p className="w-6 shrink-0 text-center font-display text-sm text-muted">{row.rank}</p>
            <Avatar name={row.displayName} src={row.photoURL ?? undefined} size={36} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{row.displayName}</p>
            <div
              className="flex shrink-0 items-center gap-1"
              aria-label={`${correct} of ${mainCard.length} correct`}
            >
              {mainCard.map((bout) => (
                <span
                  key={bout.id}
                  aria-hidden="true"
                  className={clsx('size-1.5 rounded-full', OUTCOME_DOT[boutPickOutcome(row.picks[bout.id], bout)])}
                />
              ))}
            </div>
            <p
              className={clsx(
                'w-14 shrink-0 text-right text-sm font-semibold tabular-nums',
                row.score.total >= 0 ? 'text-win' : 'text-loss',
              )}
            >
              {row.score.total >= 0 ? '+' : ''}
              {row.score.total}
            </p>
          </button>
        );
      })}
    </div>
  );
}
