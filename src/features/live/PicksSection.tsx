import { useMemo, useState } from 'react';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { Tabs } from '../../components/ui/Tabs.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { ByPersonGrid } from './ByPersonGrid.tsx';
import { isRevealed, useEntries, useComments } from './hooks.ts';
import { RevealGrid } from './RevealGrid.tsx';

interface PicksSectionProps {
  event: EventWithId;
  bouts: BoutWithId[];
}

type ViewMode = 'byFight' | 'byPerson';

const VIEW_TABS = [
  { value: 'byFight', label: 'By fight' },
  { value: 'byPerson', label: 'By person' },
];

/** Mounted by EventPage below the bout list once the event locks (docs/tasks/T15, T47). */
export function PicksSection({ event, bouts }: PicksSectionProps) {
  const { user } = useSession();
  const revealed = isRevealed(event.status);
  const entries = useEntries(event.id, revealed);
  const comments = useComments(event.id);
  const mainCard = useMemo(() => bouts.filter((bout) => bout.isMainCard), [bouts]);
  const [view, setView] = useState<ViewMode>('byFight');

  if (!revealed) return null;

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-2">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>Everyone's picks</SectionLabel>
        <Tabs items={VIEW_TABS} value={view} onChange={(value) => setView(value as ViewMode)} />
      </div>
      {entries === undefined ? (
        <Skeleton className="h-40 w-full" />
      ) : view === 'byFight' ? (
        <RevealGrid
          bouts={mainCard}
          entries={entries}
          selfUid={user?.uid ?? null}
          firstBloodEnabled={event.firstBloodEnabled}
          comments={comments}
        />
      ) : (
        <ByPersonGrid
          bouts={mainCard}
          entries={entries}
          selfUid={user?.uid ?? null}
          firstBloodEnabled={event.firstBloodEnabled}
        />
      )}
    </div>
  );
}
