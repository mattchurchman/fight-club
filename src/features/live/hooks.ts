import { useEffect, useRef, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import type { Comment, Entrant, Entry, EventStatus } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';
import { rankMoves } from './derive.ts';

export interface EntryWithId extends Entry<Timestamp> {
  id: string;
}

export interface EntrantWithId extends Entrant<Timestamp> {
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

/** `events/{id}/entrants`, sorted by `submittedAt` ascending. A pending server timestamp (not yet
 * acked for a local write) has no millis yet, so it sorts last rather than crashing. */
export function useEntrants(eventId: string | null): EntrantWithId[] | undefined {
  const [entrants, setEntrants] = useState<EntrantWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!eventId) return undefined;
    const unsubscribe = onSnapshot(collection(db, 'events', eventId, 'entrants'), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Entrant<Timestamp>) }));
      docs.sort((a, b) => (a.submittedAt?.toMillis() ?? Infinity) - (b.submittedAt?.toMillis() ?? Infinity));
      setEntrants(docs);
    });
    return () => {
      unsubscribe();
      setEntrants(undefined);
    };
  }, [eventId]);

  return entrants;
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

/**
 * Rank movement since the last finished bout (docs/tasks/T35). Keeps the previous rank
 * snapshot in a ref and only diffs against it when `lastResultKey` (the latest finished
 * bout's id) changes, so a mid-event listener re-render doesn't recompute or flicker moves.
 */
export function useRankMoves(
  rows: readonly { uid: string; rank: number }[],
  lastResultKey: string | null,
): Record<string, number> {
  const prevRanksRef = useRef<Record<string, number> | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const [moves, setMoves] = useState<Record<string, number>>({});

  useEffect(() => {
    if (lastResultKey === lastKeyRef.current) return;
    lastKeyRef.current = lastResultKey;

    const next: Record<string, number> = {};
    for (const row of rows) next[row.uid] = row.rank;

    setMoves(prevRanksRef.current ? rankMoves(prevRanksRef.current, next) : {});
    prevRanksRef.current = next;
  }, [rows, lastResultKey]);

  return moves;
}
