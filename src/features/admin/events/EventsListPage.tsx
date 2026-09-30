import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../../components/ui/Skeleton.tsx';
import { EVENT_STATUS_LABEL, formatEventDateTime } from '../../events/format.ts';
import { useAllEvents } from './hooks.ts';
import type { AdminEventWithId } from './hooks.ts';
import { setEventEnabled } from './eventWrites.ts';

function EventRow({ event }: { event: AdminEventWithId }) {
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    try {
      await setEventEnabled(event.id, !event.enabled);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex items-center justify-between gap-3">
      <Link to={`/admin/events/${event.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{event.name}</p>
        <p className="truncate text-xs text-muted">
          {event.subtitle ?? event.kind} · {EVENT_STATUS_LABEL[event.status]} ·{' '}
          {formatEventDateTime(event.startsAt.toMillis())}
        </p>
      </Link>
      <Button
        variant={event.enabled ? 'secondary' : 'primary'}
        className={clsx('min-h-8 shrink-0 px-3 text-xs', !event.enabled && 'opacity-80')}
        disabled={busy}
        onClick={handleToggle}
      >
        {event.enabled ? 'Enabled' : 'Disabled'}
      </Button>
    </Card>
  );
}

export function EventsListPage() {
  const { events, loading } = useAllEvents();

  if (loading) return <Skeleton className="m-4 h-40" />;
  if (events.length === 0) return <EmptyState title="No events imported yet" />;

  return (
    <div className="flex flex-col gap-2 p-4">
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  );
}
