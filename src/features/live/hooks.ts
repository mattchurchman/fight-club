import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Entry, EventStatus } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

export interface EntryWithId extends Entry<Timestamp> {
  id: string;
}

const REVEALED_STATUSES: readonly EventStatus[] = ['locked', 'live', 'final'];

/** Mirrors firestore.rules `entriesRevealed`: everyone's picks are visible once the event locks. */
export function isRevealed(status: EventStatus | null | undefined): boolean {
  return !!status && REVEALED_STATUSES.includes(status);
}

/** undefined = loading/not subscribed. Only subscribes once revealed — the rules deny it earlier. */
export function useEntries(eventId: string | null, revealed: boolean): EntryWithId[] | undefined {
  const [entries, setEntries] = useState<EntryWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!eventId || !revealed) return undefined;
    const unsubscribe = onSnapshot(collection(db, 'events', eventId, 'entries'), (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Entry<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setEntries(undefined);
    };
  }, [eventId, revealed]);

  return entries;
}
