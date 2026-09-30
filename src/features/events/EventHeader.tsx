import clsx from 'clsx';
import type { EventStatus } from '@shared/index.ts';
import { Countdown } from '../../components/ui/Countdown.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import type { EventWithId } from './hooks.ts';
import { EVENT_STATUS_LABEL, formatEventDateTime } from './format.ts';

const STATUS_TONE: Record<EventStatus, string> = {
  scheduled: 'border-line bg-surface-2 text-muted',
  open: 'border-line bg-surface-2 text-muted',
  locked: 'border-gold/40 bg-gold/10 text-gold',
  live: 'border-loss/40 bg-loss/10 text-loss',
  final: 'border-line bg-surface-2 text-text',
  cancelled: 'border-loss/40 bg-loss/10 text-loss',
};

interface EventHeaderProps {
  event: EventWithId;
}

export function EventHeader({ event }: EventHeaderProps) {
  const showCountdown = event.status === 'open';
  const showPot = event.status === 'locked' || event.status === 'live' || event.status === 'final';

  return (
    <div className="flex flex-col gap-2 border-b border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl uppercase tracking-wide text-text">
            {event.name}
          </h2>
          {event.subtitle ? <p className="truncate text-sm text-muted">{event.subtitle}</p> : null}
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-chip border px-3 py-1 text-xs font-semibold',
            STATUS_TONE[event.status],
          )}
        >
          {EVENT_STATUS_LABEL[event.status]}
        </span>
      </div>

      <p className="text-sm text-muted">{formatEventDateTime(event.startsAt.toMillis())}</p>

      {showCountdown || showPot ? (
        <div className="flex flex-wrap items-center gap-4">
          {showCountdown ? (
            <Countdown target={event.lockAt.toMillis()} className="text-sm font-semibold text-text" />
          ) : null}
          {showPot ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                Buy-in <TokenPill balance={event.buyIn} />
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                Pot <TokenPill balance={event.pot} />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
