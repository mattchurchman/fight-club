import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { PicksSection } from '../live/PicksSection.tsx';
import { PickBuilder } from '../picks/PickBuilder.tsx';
import { BoutCard } from './BoutCard.tsx';
import { EventHeader } from './EventHeader.tsx';
import { EventSwitcher } from './EventSwitcher.tsx';
import { selectDefaultEventId, useBouts, useEvent, useEvents } from './hooks.ts';

function BoutListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

/** Renders the default event at `/`, or a specific one at `/event/:id` (docs/tasks/T13). */
export function EventPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const { upcoming, recent, loading: eventsLoading } = useEvents();
  const defaultId = useMemo(() => selectDefaultEventId(upcoming, recent), [upcoming, recent]);
  const activeId = routeId ?? defaultId;

  const event = useEvent(activeId);
  const bouts = useBouts(activeId);

  if (eventsLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <BoutListSkeleton />
      </div>
    );
  }

  if (!activeId) {
    return <EmptyState title="No events yet" description="Check back closer to fight night." />;
  }

  if (event === null) {
    return <EmptyState title="Event not found" description="It may have been removed." />;
  }

  return (
    <div className="flex flex-col">
      <EventSwitcher upcoming={upcoming} recent={recent} activeId={activeId} />
      {event ? <EventHeader event={event} /> : <Skeleton className="mx-4 mt-4 h-24" />}
      {bouts === undefined ? (
        <BoutListSkeleton />
      ) : bouts.length === 0 ? (
        <EmptyState
          title="Card not announced yet"
          description="Check back closer to fight night."
        />
      ) : event ? (
        <>
          <PickBuilder event={event} bouts={bouts} />
          <PicksSection event={event} bouts={bouts} />
        </>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {bouts.map((bout) => (
            <BoutCard key={bout.id} bout={bout} />
          ))}
        </div>
      )}
    </div>
  );
}
