import { useRef, useState } from 'react';
import { APP_NAME } from '@shared/index.ts';
import { Button } from '../../components/ui/Button.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import type { EntryWithId } from '../live/hooks.ts';
import { buildLeaderboard } from '../live/leaderboard.ts';
import { findCallOfTheNight } from './callOfTheNight.ts';
import { PicksPoster } from './PicksPoster.tsx';
import { ResultsPoster } from './ResultsPoster.tsx';
import { sharePoster } from './sharePoster.ts';

interface ShareButtonProps {
  event: EventWithId;
  bouts: BoutWithId[];
  entries: EntryWithId[];
  selfUid: string | null;
}

/**
 * Before the event is final: "Share my picks" (your own card, requires you've submitted).
 * Once final: "Share results" (podium + call of the night). Offscreen posters stay mounted
 * so the capture has real layout to read (docs/tasks/T22).
 */
export function ShareButton({ event, bouts, entries, selfUid }: ShareButtonProps) {
  const { show } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);
  const picksRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const mainCard = bouts.filter((bout) => bout.isMainCard);
  const isFinal = event.status === 'final';
  const self = entries.find((entry) => entry.uid === selfUid) ?? null;

  if (!isFinal && !self) return null;

  const rows = isFinal ? buildLeaderboard(entries) : [];
  const callOfTheNight = isFinal ? findCallOfTheNight(entries, mainCard) : null;

  async function handleShare() {
    const node = isFinal ? resultsRef.current : picksRef.current;
    if (!node) return;
    setSharing(true);
    try {
      await sharePoster(node, {
        width: 1080,
        height: 1350,
        filename: isFinal ? `${event.name}-results.png` : `${event.name}-picks.png`,
        title: APP_NAME,
        text: isFinal ? `${event.name} results` : `My ${event.name} picks`,
      });
    } catch {
      show("Couldn't make the image. Try again.", { variant: 'error' });
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handleShare} loading={sharing} className="mx-4">
        {isFinal ? 'Share results' : 'Share my picks'}
      </Button>
      <div className="fixed left-[-10000px] top-0" aria-hidden="true">
        {isFinal ? (
          <ResultsPoster
            ref={resultsRef}
            eventName={event.name}
            rows={rows}
            callOfTheNight={callOfTheNight}
            selfUid={selfUid}
          />
        ) : self ? (
          <PicksPoster
            ref={picksRef}
            eventName={event.name}
            displayName={self.displayName}
            bouts={mainCard}
            picks={self.picks}
            lockBoutId={self.lockBoutId}
          />
        ) : null}
      </div>
    </>
  );
}
