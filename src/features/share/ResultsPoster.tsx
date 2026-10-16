import { forwardRef } from 'react';
import type { Ranked } from '@shared/index.ts';
import { formatAmerican } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Lockup } from '../../components/brand/Brand.tsx';
import type { LeaderboardRow } from '../live/leaderboard.ts';
import type { CallOfTheNight } from './callOfTheNight.ts';

export interface ResultsPosterProps {
  eventLabel: string;
  headline: string;
  rows: Ranked<LeaderboardRow>[];
  callOfTheNight: CallOfTheNight | null;
  selfUid: string | null;
}

/** Offscreen 1080×1350 poster: podium, call of the night, your rank (docs/tasks/T22, restyled T42).
 * Avatars render a player's `photoURL` when set — a data URI always rasterizes inside the canvas
 * capture (unlike a remote headshot URL, which `html-to-image` can't read cross-origin). */
export const ResultsPoster = forwardRef<HTMLDivElement, ResultsPosterProps>(function ResultsPoster(
  { eventLabel, headline, rows, callOfTheNight, selfUid },
  ref,
) {
  const podium = rows.slice(0, 3);
  const self = rows.find((row) => row.uid === selfUid) ?? null;

  return (
    <div ref={ref} className="flex h-[1350px] w-[1080px] flex-col justify-between bg-bg px-16 py-20 text-text">
      <div className="flex flex-col gap-5">
        <Lockup className="w-[220px]" />
        <div className="flex flex-col gap-2">
          <p className="text-[28px] font-semibold uppercase tracking-[0.2em] text-muted">{eventLabel}</p>
          <h1 className="font-display text-[72px] uppercase leading-[1.05]">{headline}</h1>
          <span aria-hidden="true" className="h-[10px] w-24 bg-red" />
        </div>
        <p className="text-[28px] text-muted">Results are in. No take-backs.</p>
      </div>

      <div className="flex flex-col gap-6">
        {podium.map((row, index) => (
          <div key={row.uid} className="flex items-center gap-6 rounded-[32px] border-2 border-line bg-surface p-8">
            <span
              className="w-16 shrink-0 text-center font-display text-[56px]"
              style={
                index === 0
                  ? { WebkitTextStroke: '3px var(--color-text)', color: 'transparent' }
                  : { color: 'var(--color-muted)' }
              }
            >
              {row.rank}
            </span>
            <Avatar name={row.displayName} src={row.photoURL ?? undefined} size={96} />
            <p className="min-w-0 flex-1 truncate text-[44px] font-semibold">{row.displayName}</p>
            <p className="shrink-0 text-[48px] font-semibold tabular-nums text-text">
              {row.score.total >= 0 ? '+' : ''}
              {row.score.total}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {callOfTheNight ? (
          <div className="relative overflow-hidden rounded-[32px] bg-surface p-8 pt-10">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-red" />
            <p className="text-[24px] font-semibold uppercase tracking-[0.2em] text-muted">Call of the night</p>
            <p className="mt-3 text-[36px] font-semibold leading-tight">
              {callOfTheNight.displayName} called {callOfTheNight.fighterName} at{' '}
              {formatAmerican(callOfTheNight.odds)}
            </p>
          </div>
        ) : null}
        {self ? (
          <p className="text-center text-[32px] font-semibold text-muted">
            You finished #{self.rank} · {self.score.total >= 0 ? '+' : ''}
            {self.score.total} pts
          </p>
        ) : null}
      </div>
    </div>
  );
});
