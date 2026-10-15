import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { formatEventDateTime } from './format.ts';
import { usePastEvents } from './hooks.ts';

/** "Tony", "Tony & Sam", or "Tony, Sam & Mo" for a (possibly tied) rank-1. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** `/events`: every final event, newest first (docs/tasks/T40, docs/DESIGN.md "Archive & profiles"). */
export function EventsArchivePage() {
  const { user } = useSession();
  const rows = usePastEvents(user?.uid ?? null);

  return (
    <div className="flex flex-col gap-3 p-4">
      <SectionLabel>Past events</SectionLabel>
      {rows === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No past events" description="Finished fight nights show up here." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              to={`/event/${row.id}`}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {row.number ? `UFC ${row.number}` : row.name}
                </p>
                <p className="truncate text-xs text-muted">{formatEventDateTime(row.startsAtMs)}</p>
                {row.winnerNames.length > 0 ? (
                  <p className="truncate text-xs text-muted">🏆 {joinNames(row.winnerNames)}</p>
                ) : null}
              </div>
              <TokenPill balance={row.pot} className="shrink-0" />
              <p className="w-20 shrink-0 text-right text-sm font-medium text-muted">
                {row.selfRank != null ? `You #${row.selfRank}` : "Didn't play"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
