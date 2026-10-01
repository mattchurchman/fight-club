import { useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import type { Comment, Entry, EventStatus } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

export interface EntryWithId extends Entry<Timestamp> {
  id: string;
}

export interface CommentWithId extends Comment<Timestamp> {
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

/** Load the last 100 comments for an event, ordered by createdAt. */
export function useComments(eventId: string | null): CommentWithId[] | undefined {
  const [comments, setComments] = useState<CommentWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!eventId) return undefined;
    const q = query(
      collection(db, 'events', eventId, 'comments'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Comment<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setComments(undefined);
    };
  }, [eventId]);

  return comments;
}
