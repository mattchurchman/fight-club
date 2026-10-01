import { useMemo } from 'react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { BadgesRow } from './BadgesRow.tsx';
import { EventHistoryList } from './EventHistoryList.tsx';
import { H2HSection } from './H2HSection.tsx';
import { Sparkline } from './Sparkline.tsx';
import { useEventHistory, useH2HFor, useProfileUser, useUsersById } from './hooks.ts';

function SectionLabel({ children }: { children: string }) {
  return <p className="px-4 text-xs font-semibold uppercase text-muted">{children}</p>;
}

interface ProfileBodyProps {
  uid: string;
  /** Whether this is the signed-in player's own profile — hides the duplicate header & H2H-vs-self. */
  isSelf: boolean;
  viewerUid: string | null;
}

/** Shared body for `/u/:username` and `/me` (docs/tasks/T21): badges, stats, sparkline, history, H2H. */
export function ProfileBody({ uid, isSelf, viewerUid }: ProfileBodyProps) {
  const user = useProfileUser(uid);
  const history = useEventHistory(uid);
  const h2hDocs = useH2HFor(uid);
  const { byId: usersById } = useUsersById();

  const seasonSparkline = useMemo(() => {
    if (!history || history.length === 0) return [];
    const latestSeasonId = history[0]!.seasonId;
    return history
      .filter((row) => row.seasonId === latestSeasonId)
      .slice()
      .sort((a, b) => a.startsAtMs - b.startsAtMs)
      .map((row) => row.points);
  }, [history]);

  if (user === undefined) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (user === null) {
    return <EmptyState title="Player not found" description="They may have left the group." />;
  }

  const stats = user.stats;

  return (
    <div className="flex flex-col gap-5 p-4">
      {!isSelf && (
        <Card className="flex flex-col items-center gap-2 py-6 text-center">
          <Avatar name={user.displayName} src={user.photoURL ?? undefined} size={64} />
          <div>
            <p className="font-display text-lg uppercase text-text">{user.displayName}</p>
            <p className="text-sm text-muted">@{user.username}</p>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel>Badges</SectionLabel>
        <BadgesRow earned={user.badges ?? []} />
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Lifetime stats</SectionLabel>
        {stats ? (
          <div className="grid grid-cols-3 gap-2 px-4">
            {(
              [
                ['Points', stats.points],
                ['Events', stats.events],
                ['Wins', stats.wins],
                ['Podiums', stats.podiums],
                ['Correct winners', stats.correctWinners],
              ] satisfies [string, number][]
            ).map(([label, value]) => (
              <Card key={label} className="flex flex-col items-center gap-1 py-3">
                <p className="text-lg font-semibold tabular-nums text-text">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="px-4 text-sm text-muted">No events played yet.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>This season</SectionLabel>
        <div className="px-4">
          <Sparkline values={seasonSparkline} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Event history</SectionLabel>
        <div className="px-4">
          {history === undefined ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <EventHistoryList rows={history} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Head-to-head</SectionLabel>
        <div className="px-4">
          {h2hDocs === undefined ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <H2HSection docs={h2hDocs} profileUid={uid} viewerUid={viewerUid} usersById={usersById} />
          )}
        </div>
      </div>
    </div>
  );
}
