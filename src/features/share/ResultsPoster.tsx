import { forwardRef } from 'react';
import clsx from 'clsx';
import type { Ranked } from '@shared/index.ts';
import { APP_NAME, formatAmerican } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import type { LeaderboardRow } from '../live/leaderboard.ts';
import type { CallOfTheNight } from './callOfTheNight.ts';

const MEDALS = ['🥇', '🥈', '🥉'];

export interface ResultsPosterProps {
  eventName: string;
  rows: Ranked<LeaderboardRow>[];
  callOfTheNight: CallOfTheNight | null;
  selfUid: string | null;
}

/** Offscreen 1080×1350 poster: podium, call of the night, your rank (docs/tasks/T22). Avatars render as
 * initials only — remote headshots can be CORS-blocked inside the canvas capture. */
export const ResultsPoster = forwardRef<HTMLDivElement, ResultsPosterProps>(function ResultsPoster(
  { eventName, rows, callOfTheNight, selfUid },
  ref,
) {
  const podium = rows.slice(0, 3);
  const self = rows.find((row) => row.uid === selfUid) ?? null;

  return (
    <div ref={ref} className="flex h-[1350px] w-[1080px] flex-col justify-between bg-bg px-16 py-20 text-text">
      <div className="flex flex-col gap-3">
        <p className="text-[32px] font-semibold uppercase tracking-[0.3em] text-gold">{APP_NAME}</p>
        <h1 className="font-display text-[72px] uppercase leading-[1.05]">{eventName}</h1>
        <p className="text-[28px] text-muted">Results are in. No take-backs.</p>
      </div>

      <div className="flex flex-col gap-6">
        {podium.map((row, index) => (
          <div
            key={row.uid}
            className={clsx(
              'flex items-center gap-6 rounded-[32px] border-2 p-8',
              index === 0 ? 'border-gold bg-gold/10' : 'border-line bg-surface',
            )}
          >
            <span className="w-16 shrink-0 text-center text-[56px]">{MEDALS[index]}</span>
            <Avatar name={row.displayName} size={96} />
            <p className="min-w-0 flex-1 truncate text-[44px] font-semibold">{row.displayName}</p>
            <p
              className={clsx(
                'shrink-0 text-[48px] font-semibold tabular-nums',
                row.score.total >= 0 ? 'text-win' : 'text-loss',
              )}
            >
              {row.score.total >= 0 ? '+' : ''}
              {row.score.total}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {callOfTheNight ? (
          <div className="rounded-[32px] border-2 border-gold bg-gold/10 p-8">
            <p className="text-[24px] font-semibold uppercase tracking-[0.2em] text-gold">Call of the night</p>
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
