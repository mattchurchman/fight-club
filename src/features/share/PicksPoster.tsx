import { forwardRef } from 'react';
import clsx from 'clsx';
import type { Pick as EntryPick } from '@shared/index.ts';
import { Lockup } from '../../components/brand/Brand.tsx';
import type { BoutWithId } from '../events/hooks.ts';

export interface PicksPosterProps {
  eventLabel: string;
  headline: string;
  displayName: string;
  bouts: BoutWithId[];
  picks: Record<string, EntryPick>;
  lockBoutId: string;
}

function surname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

/** Offscreen 1080×1350 "my picks" card, sharable right after lock, before results are in
 * (docs/tasks/T22, restyled T42). */
export const PicksPoster = forwardRef<HTMLDivElement, PicksPosterProps>(function PicksPoster(
  { eventLabel, headline, displayName, bouts, picks, lockBoutId },
  ref,
) {
  return (
    <div ref={ref} className="flex h-[1350px] w-[1080px] flex-col justify-between bg-bg px-16 py-20 text-text">
      <div className="flex flex-col gap-5">
        <Lockup className="w-[220px]" />
        <div className="flex flex-col gap-2">
          <p className="text-[28px] font-semibold uppercase tracking-[0.2em] text-muted">{eventLabel}</p>
          <h1 className="font-display text-[72px] uppercase leading-[1.05]">{headline}</h1>
          <span aria-hidden="true" className="h-[10px] w-24 bg-red" />
        </div>
        <p className="text-[32px] font-semibold text-text">{displayName}'s picks</p>
        <p className="text-[28px] text-muted">Picks locked. No take-backs.</p>
      </div>

      <div className="flex flex-col gap-4">
        {bouts.map((bout) => {
          const pick = picks[bout.id];
          if (!pick) return null;
          const fighterName = surname(pick.winner === 'A' ? bout.a.name : bout.b.name);

          return (
            <div
              key={bout.id}
              className={clsx(
                'flex items-center gap-5 rounded-[28px] border-2 p-7',
                lockBoutId === bout.id ? 'border-text bg-surface-2' : 'border-line bg-surface',
              )}
            >
              <span className="w-14 shrink-0 text-center text-[40px]" aria-hidden="true">
                {lockBoutId === bout.id ? '🔒' : ''}
              </span>
              <p className="min-w-0 flex-1 truncate font-display text-[38px]">{fighterName}</p>
              <p className="shrink-0 text-[24px] uppercase text-muted">{pick.method}</p>
              <p className="w-28 shrink-0 text-right text-[32px] font-semibold tabular-nums text-muted">
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
