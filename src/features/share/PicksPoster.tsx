import { forwardRef } from 'react';
import clsx from 'clsx';
import type { Pick as EntryPick } from '@shared/index.ts';
import { APP_NAME } from '@shared/index.ts';
import type { BoutWithId } from '../events/hooks.ts';

export interface PicksPosterProps {
  eventName: string;
  displayName: string;
  bouts: BoutWithId[];
  picks: Record<string, EntryPick>;
  lockBoutId: string;
}

/** Offscreen 1080×1350 "my picks" card, sharable right after lock, before results are in (docs/tasks/T22). */
export const PicksPoster = forwardRef<HTMLDivElement, PicksPosterProps>(function PicksPoster(
  { eventName, displayName, bouts, picks, lockBoutId },
  ref,
) {
  return (
    <div ref={ref} className="flex h-[1350px] w-[1080px] flex-col justify-between bg-bg px-16 py-20 text-text">
      <div className="flex flex-col gap-3">
        <p className="text-[32px] font-semibold uppercase tracking-[0.3em] text-gold">{APP_NAME}</p>
        <h1 className="font-display text-[72px] uppercase leading-[1.05]">{eventName}</h1>
        <p className="text-[32px] font-semibold text-text">{displayName}'s picks</p>
        <p className="text-[28px] text-muted">Picks locked. No take-backs.</p>
      </div>

      <div className="flex flex-col gap-4">
        {bouts.map((bout) => {
          const pick = picks[bout.id];
          if (!pick) return null;
          const fighterName = pick.winner === 'A' ? bout.a.name : bout.b.name;

          return (
            <div
              key={bout.id}
              className={clsx(
                'flex items-center gap-5 rounded-[28px] border-2 p-7',
                lockBoutId === bout.id ? 'border-gold bg-gold/10' : 'border-line bg-surface',
              )}
            >
              <span className="w-14 shrink-0 text-center text-[40px]" aria-hidden="true">
                {lockBoutId === bout.id ? '🔒' : ''}
              </span>
              <p className="min-w-0 flex-1 truncate text-[38px] font-semibold">{fighterName}</p>
              <p className="shrink-0 text-[28px] uppercase text-muted">{pick.method}</p>
              <p className="w-28 shrink-0 text-right text-[32px] font-semibold tabular-nums text-gold">
                {pick.stake}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[28px] text-muted">Think you can do better? Beat me.</p>
    </div>
  );
});
