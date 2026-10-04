import { useMemo, useState } from 'react';
import { Countdown } from '../../components/ui/Countdown.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { selectDefaultEventId, useBouts, useEvent, useEvents } from '../events/hooks.ts';
import { ShareButton } from '../share/ShareButton.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { LastResultBanner } from './LastResultBanner.tsx';
import { LiveLeaderboard } from './LiveLeaderboard.tsx';
import { PlayerSheet } from './PlayerSheet.tsx';
import { isRevealed, useEntries, useComments } from './hooks.ts';

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
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="font-display text-xl uppercase text-text">Picks lock in</p>
        <Countdown target={event.lockAt.toMillis()} prefix="" className="font-display text-3xl text-gold" />
        <p className="text-sm text-muted">Reveal happens the moment picks lock. No peeking.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-4 pb-4">
      {bouts ? <LastResultBanner bouts={bouts} /> : null}
      {entries === undefined || bouts === undefined ? (
        <Skeleton className="mx-4 h-40" />
      ) : entries.length === 0 ? (
        <EmptyState title="No entries" description="Nobody picked this one." />
      ) : (
        <>
          <LiveLeaderboard entries={entries} bouts={bouts} onTap={setOpenUid} />
          <ShareButton event={event} bouts={bouts} entries={entries} selfUid={user?.uid ?? null} />
        </>
      )}
      <div className="safe-bottom fixed bottom-16 left-0 right-0 z-30 flex justify-center gap-2 px-4">
        <button
          onClick={() => setChatOpen(true)}
          className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-background shadow-lg hover:opacity-90"
        >
          💬 Trash Talk
        </button>
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
        open={openEntry != null}
        onClose={() => setOpenUid(null)}
      />
    </div>
  );
}
