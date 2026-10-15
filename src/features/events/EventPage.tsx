import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Bout } from '@shared/index.ts';
import { Button } from '../../components/ui/Button.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { TrashTalkButton } from '../chat/TrashTalkButton.tsx';
import { resultsFeed } from '../live/derive.ts';
import { useComments, useEntries } from '../live/hooks.ts';
import { LiveLeaderboard } from '../live/LiveLeaderboard.tsx';
import { PicksSection } from '../live/PicksSection.tsx';
import { PlayerSheet } from '../live/PlayerSheet.tsx';
import { ResultsList } from '../live/ResultsList.tsx';
import { usePickDraft } from '../picks/usePickDraft.ts';
import { BoutCard } from './BoutCard.tsx';
import { EventHeader } from './EventHeader.tsx';
import { EventSwitcher } from './EventSwitcher.tsx';
import { FightCardList } from './FightCardList.tsx';
import { selectDefaultEventId, useBouts, useEvent, useEvents } from './hooks.ts';

const TRASH_TALK_STATUSES = new Set(['open', 'locked', 'live']);

function BoutListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

/** Renders the default event at `/`, or a specific one at `/event/:id` (docs/tasks/T13, T31). */
export function EventPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const { upcoming, recent, loading: eventsLoading } = useEvents();
  const defaultId = useMemo(() => selectDefaultEventId(upcoming, recent), [upcoming, recent]);
  const activeId = routeId ?? defaultId;

  const event = useEvent(activeId);
  const bouts = useBouts(activeId);
  const draft = usePickDraft(activeId, event, bouts);
  const comments = useComments(activeId);
  const [chatOpen, setChatOpen] = useState(false);
  const [openUid, setOpenUid] = useState<string | null>(null);
  const showTrashTalk = !!event && TRASH_TALK_STATUSES.has(event.status);
  const isFinal = event?.status === 'final';
  const entries = useEntries(activeId, isFinal);
  const boutsById = useMemo(
    () => Object.fromEntries((bouts ?? []).map((bout) => [bout.id, bout])) as Record<string, Bout>,
    [bouts],
  );
  const feed = useMemo(
    () => (isFinal && entries ? resultsFeed(boutsById, entries, user?.uid ?? null) : []),
    [isFinal, entries, boutsById, user?.uid],
  );
  const openEntry = entries?.find((entry) => entry.uid === openUid) ?? null;

  if (eventsLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <BoutListSkeleton />
      </div>
    );
  }

  if (!activeId) {
    return <EmptyState title="No events yet" description="Check back closer to fight night." />;
  }

  if (event === null) {
    return <EmptyState title="Event not found" description="It may have been removed." />;
  }

  return (
    <div className="flex flex-col">
      <EventSwitcher upcoming={upcoming} recent={recent} activeId={activeId} />
      {event ? <EventHeader event={event} /> : <Skeleton className="mx-4 mt-4 h-24" />}
      {bouts === undefined || draft.loading ? (
        <BoutListSkeleton />
      ) : bouts.length === 0 ? (
        <EmptyState
          title="Card not announced yet"
          description="Check back closer to fight night."
        />
      ) : event ? (
        <>
          {isFinal ? (
            entries === undefined ? (
              <Skeleton className="mx-4 h-40" />
            ) : entries.length === 0 ? (
              <EmptyState title="No entries" description="Nobody picked this one." />
            ) : (
              <>
                <LiveLeaderboard entries={entries} bouts={bouts} moves={{}} final onTap={setOpenUid} />
                <ResultsList feed={feed} />
              </>
            )
          ) : draft.readOnly ? (
            draft.entry ? (
              <FightCardList
                bouts={bouts}
                picks={draft.draft.picks}
                lockBoutId={draft.draft.lockBoutId}
                readOnly
              />
            ) : (
              <EmptyState title="No entry" description="You didn't pick this one." />
            )
          ) : (
            <>
              <FightCardList
                bouts={bouts}
                picks={draft.draft.picks}
                lockBoutId={draft.draft.lockBoutId}
                readOnly={false}
                onSelect={(boutId) => navigate(`/event/${event.id}/picks?fight=${boutId}`)}
              />
              <div className="p-4">
                <Link to={`/event/${event.id}/picks`}>
                  <Button type="button" className="w-full">
                    {draft.entry ? 'Edit picks' : 'Make your picks'}
                  </Button>
                </Link>
              </div>
            </>
          )}
          {showTrashTalk ? (
            <div className="px-4 pb-2">
              <TrashTalkButton count={comments?.length ?? 0} onClick={() => setChatOpen(true)} />
            </div>
          ) : null}
          <PicksSection event={event} bouts={bouts} />
        </>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {bouts.map((bout) => (
            <BoutCard key={bout.id} bout={bout} />
          ))}
        </div>
      )}
      {event ? (
        <ChatPanel
          eventId={activeId}
          comments={comments}
          bouts={bouts}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          picksSecret={event.status === 'open'}
        />
      ) : null}
      <PlayerSheet
        entry={openEntry}
        bouts={bouts ?? []}
        open={openEntry != null}
        onClose={() => setOpenUid(null)}
      />
    </div>
  );
}
