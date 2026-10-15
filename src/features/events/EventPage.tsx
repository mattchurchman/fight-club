import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { PicksSection } from '../live/PicksSection.tsx';
import { usePickDraft } from '../picks/usePickDraft.ts';
import { BoutCard } from './BoutCard.tsx';
import { EventHeader } from './EventHeader.tsx';
import { EventSwitcher } from './EventSwitcher.tsx';
import { FightCardList } from './FightCardList.tsx';
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

/** Renders the default event at `/`, or a specific one at `/event/:id` (docs/tasks/T13, T31). */
export function EventPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { upcoming, recent, loading: eventsLoading } = useEvents();
  const defaultId = useMemo(() => selectDefaultEventId(upcoming, recent), [upcoming, recent]);
  const activeId = routeId ?? defaultId;

  const event = useEvent(activeId);
  const bouts = useBouts(activeId);
  const draft = usePickDraft(activeId, event, bouts);

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
      {bouts === undefined || draft.loading ? (
        <BoutListSkeleton />
      ) : bouts.length === 0 ? (
        <EmptyState
          title="Card not announced yet"
          description="Check back closer to fight night."
        />
      ) : event ? (
        <>
          {draft.readOnly ? (
            draft.entry ? (
              <FightCardList
                bouts={bouts}
                picks={draft.draft.picks}
                lockBoutId={draft.draft.lockBoutId}
                readOnly
              />
            ) : (
              <EmptyState title="No entry" description="You didn't pick this one." />
            )
          ) : (
            <>
              <FightCardList
                bouts={bouts}
                picks={draft.draft.picks}
                lockBoutId={draft.draft.lockBoutId}
                readOnly={false}
                onSelect={(boutId) => navigate(`/event/${event.id}/picks?fight=${boutId}`)}
              />
              <div className="p-4">
                <Link to={`/event/${event.id}/picks`}>
                  <Button type="button" className="w-full">
                    {draft.entry ? 'Edit picks' : 'Make your picks'}
                  </Button>
                </Link>
              </div>
            </>
          )}
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
