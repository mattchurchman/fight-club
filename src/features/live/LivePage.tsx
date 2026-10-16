import { useMemo, useState } from 'react';
import type { Bout } from '@shared/index.ts';
import { Countdown } from '../../components/ui/Countdown.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import { selectDefaultEventId, useBouts, useEvent, useEvents } from '../events/hooks.ts';
import { FightCardList } from '../events/FightCardList.tsx';
import { ShareButton } from '../share/ShareButton.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { TrashTalkButton } from '../chat/TrashTalkButton.tsx';
import { useUsersById } from '../profile/hooks.ts';
import { currentBout, resultsFeed, swingLines } from './derive.ts';
import { LiveLeaderboard } from './LiveLeaderboard.tsx';
import { PlayerSheet } from './PlayerSheet.tsx';
import { ResultFlash } from './ResultFlash.tsx';
import { ResultsList } from './ResultsList.tsx';
import { StatusStrip } from './StatusStrip.tsx';
import { InTheCage } from './InTheCage.tsx';
import { YourRow } from './YourRow.tsx';
import { buildLeaderboard } from './leaderboard.ts';
import { isRevealed, useEntries, useComments, useRankMoves } from './hooks.ts';
import { useNewResults } from './useNewResults.ts';

function boutsById(bouts: BoutWithId[] | undefined): Record<string, Bout> {
  return Object.fromEntries((bouts ?? []).map((bout) => [bout.id, bout]));
}

/** The `/live` tab: leaderboard once the active event locks, a countdown before that (docs/tasks/T15). */
export function LivePage() {
  const { user } = useSession();
  const { upcoming, recent, loading: eventsLoading } = useEvents();
  const activeId = useMemo(() => selectDefaultEventId(upcoming, recent), [upcoming, recent]);
  const event = useEvent(activeId);
  const bouts = useBouts(activeId);
  const revealed = isRevealed(event?.status);
  const entries = useEntries(activeId, revealed);
  const comments = useComments(activeId);
  const [chatOpen, setChatOpen] = useState(false);
  const [openUid, setOpenUid] = useState<string | null>(null);
  const openEntry = entries?.find((entry) => entry.uid === openUid) ?? null;

  const boutsMap = useMemo(() => boutsById(bouts), [bouts]);
  const currentBoutId = bouts ? currentBout(boutsMap) : null;
  const currentBoutObj = bouts?.find((bout) => bout.id === currentBoutId) ?? null;
  const hasResults = bouts?.some((bout) => bout.result != null) ?? false;
  const names = useMemo(
    () => Object.fromEntries((entries ?? []).map((entry) => [entry.uid, entry.displayName])),
    [entries],
  );
  const swing = useMemo(() => {
    if (!entries || !event || !currentBoutId) return [];
    const rules = { budget: event.budget, firstBloodEnabled: event.firstBloodEnabled };
    return swingLines(entries, boutsMap, currentBoutId, user?.uid ?? null, names, rules);
  }, [entries, event, currentBoutId, boutsMap, names, user?.uid]);
  const feed = useMemo(
    () => (entries ? resultsFeed(boutsMap, entries, user?.uid ?? null) : []),
    [entries, boutsMap, user?.uid],
  );
  const lastResultKey = feed[0]?.boutId ?? null;
  const leaderboardRows = useMemo(() => (entries ? buildLeaderboard(entries) : []), [entries]);
  const rankMovesByUid = useRankMoves(
    useMemo(() => leaderboardRows.map((row) => ({ uid: row.uid, rank: row.rank })), [leaderboardRows]),
    lastResultKey,
  );
  const selfRow = user ? leaderboardRows.find((row) => row.uid === user.uid) ?? null : null;
  const { newResultBoutId, dismiss: dismissFlash } = useNewResults(revealed ? boutsMap : undefined);
  const flashRow = feed.find((row) => row.boutId === newResultBoutId) ?? null;
  const { byId: usersById } = useUsersById();
  const usernameByUid = useMemo(
    () => Object.fromEntries(Object.entries(usersById).map(([uid, u]) => [uid, u.username])),
    [usersById],
  );

  if (eventsLoading || event === undefined) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!activeId || event === null) {
    return <EmptyState title="Nothing live" description="The leaderboard shows up once picks lock." />;
  }

  if (!revealed) {
    return (
      <div className="flex flex-col gap-4 pt-4 pb-24">
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <p className="font-display text-xl uppercase text-text">Picks lock in</p>
          <Countdown target={event.lockAt.toMillis()} prefix="" className="font-display text-3xl text-red" />
          <p className="text-sm text-muted">Reveal happens the moment picks lock. No peeking.</p>
        </div>
        {bouts ? <FightCardList bouts={bouts} readOnly /> : <Skeleton className="mx-4 h-40" />}
        <div className="safe-bottom fixed bottom-16 left-0 right-0 z-30 flex justify-center px-4">
          <TrashTalkButton count={comments?.length ?? 0} onClick={() => setChatOpen(true)} />
        </div>
        <ChatPanel
          eventId={activeId}
          comments={comments}
          bouts={bouts ?? undefined}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          picksSecret
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-4 pb-24">
      {event ? <StatusStrip event={event} bouts={boutsMap} /> : null}
      {flashRow ? (
        <ResultFlash
          row={flashRow}
          self={selfRow ? { rank: selfRow.rank, move: rankMovesByUid[selfRow.uid] ?? 0 } : null}
          onDismiss={dismissFlash}
        />
      ) : null}
      {entries && bouts ? (
        <InTheCage
          bout={currentBoutObj}
          entries={entries}
          swing={swing}
          hasResults={hasResults}
          onTap={setOpenUid}
        />
      ) : null}
      {selfRow ? (
        <YourRow rank={selfRow.rank} points={selfRow.score.total} move={rankMovesByUid[selfRow.uid] ?? 0} />
      ) : null}
      {entries === undefined || bouts === undefined ? (
        <Skeleton className="mx-4 h-40" />
      ) : entries.length === 0 ? (
        <EmptyState title="No entries" description="Nobody picked this one." />
      ) : (
        <>
          <LiveLeaderboard
            entries={entries}
            bouts={bouts}
            moves={rankMovesByUid}
            final={event.status === 'final'}
            onTap={setOpenUid}
          />
          <ResultsList feed={feed} />
          <ShareButton event={event} bouts={bouts} entries={entries} selfUid={user?.uid ?? null} />
        </>
      )}
      <div className="safe-bottom fixed bottom-16 left-0 right-0 z-30 flex justify-center px-4">
        <TrashTalkButton count={comments?.length ?? 0} onClick={() => setChatOpen(true)} />
      </div>
      <ChatPanel
        eventId={activeId}
        comments={comments}
        bouts={bouts ?? undefined}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
      <PlayerSheet
        entry={openEntry}
        bouts={bouts ?? []}
        usernameByUid={usernameByUid}
        open={openEntry != null}
        onClose={() => setOpenUid(null)}
      />
    </div>
  );
}
