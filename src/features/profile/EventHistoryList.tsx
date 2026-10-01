import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { formatEventDateTime } from '../events/format.ts';
import type { EventHistoryRow } from './hooks.ts';

interface EventHistoryListProps {
  rows: EventHistoryRow[];
}

/** Event, rank, points and payout for every card this player has been scored in, newest first. */
export function EventHistoryList({ rows }: EventHistoryListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No events scored yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Link
          key={row.eventId}
          to={`/event/${row.eventId}`}
          className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{row.name}</p>
            <p className="text-xs text-muted">{formatEventDateTime(row.startsAtMs)}</p>
          </div>
          <p className="shrink-0 text-sm font-medium text-muted">
            #{row.rank}
          </p>
          <p className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-text">
            {row.points >= 0 ? '+' : ''}
            {row.points}
          </p>
          <p
            className={clsx(
              'w-14 shrink-0 text-right text-sm font-semibold tabular-nums',
              row.payout > 0 ? 'text-win' : 'text-muted',
            )}
          >
            {row.payout > 0 ? `+${row.payout}` : '—'}
          </p>
        </Link>
      ))}
    </div>
  );
}
