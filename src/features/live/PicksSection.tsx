import { useMemo } from 'react';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { isRevealed, useEntries, useComments } from './hooks.ts';
import { RevealGrid } from './RevealGrid.tsx';

interface PicksSectionProps {
  event: EventWithId;
  bouts: BoutWithId[];
}

/** Mounted by EventPage below the bout list once the event locks (docs/tasks/T15). */
export function PicksSection({ event, bouts }: PicksSectionProps) {
  const { user } = useSession();
  const revealed = isRevealed(event.status);
  const entries = useEntries(event.id, revealed);
  const comments = useComments(event.id);
  const mainCard = useMemo(() => bouts.filter((bout) => bout.isMainCard), [bouts]);

  if (!revealed) return null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
      <SectionLabel>Everyone's picks</SectionLabel>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <RevealGrid
          bouts={mainCard}
          entries={entries}
          selfUid={user?.uid ?? null}
          firstBloodEnabled={event.firstBloodEnabled}
          comments={comments}
        />
      )}
    </div>
  );
}
