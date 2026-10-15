import { Countdown } from '../../components/ui/Countdown.tsx';
import { StatusPill } from '../../components/ui/StatusPill.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import type { EventWithId } from './hooks.ts';
import { formatEventDateTime } from './format.ts';

interface EventHeaderProps {
  event: EventWithId;
}

export function EventHeader({ event }: EventHeaderProps) {
  const showCountdown = event.status === 'open';
  const showPot = event.status === 'locked' || event.status === 'live' || event.status === 'final';
  const label = event.name.split(':')[0]!.trim();
  const headline = event.subtitle ?? event.name;

  return (
    <div className="flex flex-col gap-2 border-b border-line p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{label}</p>
          <h2 className="truncate font-display text-2xl uppercase tracking-wide text-text">
            {headline}
          </h2>
        </div>
        <StatusPill status={event.status} className="shrink-0" />
      </div>

      <p className="text-sm text-muted">{formatEventDateTime(event.startsAt.toMillis())}</p>

      {showCountdown || showPot ? (
        <div className="flex flex-wrap items-center gap-4">
          {showCountdown ? (
            <Countdown target={event.lockAt.toMillis()} className="text-sm font-semibold" />
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
