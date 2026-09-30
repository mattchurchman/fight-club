import { useMemo } from 'react';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { isRevealed, useEntries } from './hooks.ts';
import { RevealGrid } from './RevealGrid.tsx';

interface PicksSectionProps {
  event: EventWithId;
  bouts: BoutWithId[];
}

/** Mounted by EventPage below the bout list once the event locks (docs/tasks/T15). */
export function PicksSection({ event, bouts }: PicksSectionProps) {
  const revealed = isRevealed(event.status);
  const entries = useEntries(event.id, revealed);
  const mainCard = useMemo(() => bouts.filter((bout) => bout.isMainCard), [bouts]);

  if (!revealed) return null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
      <p className="font-display text-sm uppercase tracking-wide text-text">Picks</p>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <RevealGrid bouts={mainCard} entries={entries} />
      )}
    </div>
  );
}
