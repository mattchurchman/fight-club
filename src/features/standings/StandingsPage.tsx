import { useState } from 'react';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { Tabs } from '../../components/ui/Tabs.tsx';
import { useUsersById } from '../profile/hooks.ts';
import { useCurrentSeasonId, useSeasonIds, useStandings } from './hooks.ts';
import { StandingsTable } from './StandingsTable.tsx';

/** The Standings tab: a season selector (default: the current season) and its ranked table. */
export function StandingsPage() {
  const currentSeasonId = useCurrentSeasonId();
  const seasonIds = useSeasonIds(currentSeasonId ?? null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const activeSeasonId = selectedSeasonId ?? currentSeasonId ?? null;

  const rows = useStandings(activeSeasonId);
  const { byId: usersById } = useUsersById();

  if (currentSeasonId === undefined) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (currentSeasonId === null) {
    return <EmptyState title="No season configured" description="Ask an admin to set config/app.seasonId." />;
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {seasonIds.length > 1 && (
        <div className="px-4">
          <Tabs
            items={seasonIds.map((id) => ({ value: id, label: id }))}
            value={activeSeasonId ?? currentSeasonId}
            onChange={setSelectedSeasonId}
          />
        </div>
      )}
      {rows === undefined ? (
        <div className="flex flex-col gap-2 px-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No standings yet" description="Standings build up over the season." />
      ) : (
        <StandingsTable rows={rows} usersById={usersById} />
      )}
    </div>
  );
}
