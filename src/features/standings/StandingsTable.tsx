import type { Timestamp } from 'firebase/firestore';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { Standing } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { UserWithId } from '../profile/hooks.ts';

interface StandingsTableProps {
  /** Already ranked (docs/GAME_RULES.md §8) — row order is display order. */
  rows: Standing<Timestamp>[];
  usersById: Record<string, UserWithId>;
}

/** Rank, player, points and the three season counters; tap a row to open their profile. */
export function StandingsTable({ rows, usersById }: StandingsTableProps) {
  const { user } = useSession();

  return (
    <div className="flex flex-col gap-2 p-4">
      {rows.map((row, index) => {
        const username = usersById[row.uid]?.username;
        const isMe = row.uid === user?.uid;
        const content = (
          <>
            <p className="w-6 shrink-0 text-center font-display text-sm text-muted">{index + 1}</p>
            <Avatar name={row.displayName} src={usersById[row.uid]?.photoURL ?? undefined} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{row.displayName}</p>
              <p className="truncate text-xs text-muted">
                {row.events} {row.events === 1 ? 'event' : 'events'} · {row.wins}{' '}
                {row.wins === 1 ? 'win' : 'wins'} · {row.podiums} podium{row.podiums === 1 ? '' : 's'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-text">{row.points} pts</p>
              <p
                className={clsx(
                  'text-xs font-medium tabular-nums',
                  row.netTokens > 0 ? 'text-win' : row.netTokens < 0 ? 'text-loss' : 'text-muted',
                )}
              >
                {row.netTokens > 0 ? '+' : ''}
                {row.netTokens}
              </p>
            </div>
          </>
        );

        const className = clsx(
          'flex items-center gap-3 rounded-card border p-3',
          isMe ? 'border-gold bg-gold/10' : 'border-line bg-surface',
        );

        return username ? (
          <Link key={row.uid} to={`/u/${username}`} className={className}>
            {content}
          </Link>
        ) : (
          <div key={row.uid} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
