import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip.tsx';
import type { EventWithId } from './hooks.ts';

interface EventSwitcherProps {
  upcoming: EventWithId[];
  recent: EventWithId[];
  activeId: string;
}

/** Upcoming events first (soonest lock), then recent finals (most recently held). */
export function EventSwitcher({ upcoming, recent, activeId }: EventSwitcherProps) {
  const navigate = useNavigate();
  const events = [...upcoming, ...recent];
  if (events.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto p-4 pb-0" aria-label="Events">
      {events.map((event) => (
        <Chip
          key={event.id}
          selected={event.id === activeId}
          onSelect={() => navigate(`/event/${event.id}`)}
          className="shrink-0"
        >
          {event.number ? `UFC ${event.number}` : event.name}
        </Chip>
      ))}
    </div>
  );
}
