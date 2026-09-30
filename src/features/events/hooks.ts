import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Bout, Event, EventStatus } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

export interface EventWithId extends Event<Timestamp> {
  id: string;
}

export interface BoutWithId extends Bout<Timestamp> {
  id: string;
}

const UPCOMING_STATUSES: readonly EventStatus[] = ['open', 'locked', 'live'];

interface EventLike {
  id: string;
  status: EventStatus;
  lockAt: { toMillis(): number };
  startsAt: { toMillis(): number };
}

/**
 * Pure split of enabled events into the upcoming chip list (open/locked/live, soonest lock
 * first) and the recent one (final, most recently held first). Kept apart from the Firestore
 * listener below so it's trivial to unit test.
 */
export function categorizeEvents<E extends EventLike>(events: E[]): { upcoming: E[]; recent: E[] } {
  const upcoming = events
    .filter((e) => UPCOMING_STATUSES.includes(e.status))
    .sort((a, b) => a.lockAt.toMillis() - b.lockAt.toMillis());
  const recent = events
    .filter((e) => e.status === 'final')
    .sort((a, b) => b.startsAt.toMillis() - a.startsAt.toMillis());
  return { upcoming, recent };
}

/** The soonest open/locked/live event, else the most recent final one, else none. */
export function selectDefaultEventId<E extends { id: string }>(upcoming: E[], recent: E[]): string | null {
  return upcoming[0]?.id ?? recent[0]?.id ?? null;
}

export interface UseEventsResult {
  upcoming: EventWithId[];
  recent: EventWithId[];
  loading: boolean;
}

/** Only `enabled` events are ever shown to players (docs/tasks/T13). */
export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventWithId[] | undefined>(undefined);

  useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'),
      where('enabled', '==', true),
      orderBy('startsAt', 'asc'),
    );
    const unsubscribe = onSnapshot(eventsQuery, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Event<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setEvents(undefined);
    };
  }, []);

  return useMemo(() => {
    if (events === undefined) return { upcoming: [], recent: [], loading: true };
    return { ...categorizeEvents(events), loading: false };
  }, [events]);
}

/** undefined = loading, null = no such event. */
export function useEvent(id: string | null): EventWithId | null | undefined {
  const [event, setEvent] = useState<EventWithId | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'events', id), (snap) => {
      setEvent(snap.exists() ? { id: snap.id, ...(snap.data() as Event<Timestamp>) } : null);
    });
    return () => {
      unsubscribe();
      setEvent(undefined);
    };
  }, [id]);

  return event;
}

/** undefined = loading. Ordered main-event first (bouts/{id}.order, 1 = main event). */
export function useBouts(eventId: string | null): BoutWithId[] | undefined {
  const [bouts, setBouts] = useState<BoutWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!eventId) return undefined;
    const boutsQuery = query(collection(db, 'events', eventId, 'bouts'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(boutsQuery, (snap) => {
      setBouts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Bout<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setBouts(undefined);
    };
  }, [eventId]);

  return bouts;
}
