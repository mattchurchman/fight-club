// Admin-only reads (docs/tasks/T18). Unlike `src/features/events/hooks.ts`'s `useEvents`, this does
// not filter to `enabled` — the admin list must show disabled Fight Nights too.
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Event } from '@shared/index.ts';
import { db } from '../../../lib/firebase.ts';

export interface AdminEventWithId extends Event<Timestamp> {
  id: string;
}

export function useAllEvents(): { events: AdminEventWithId[]; loading: boolean } {
  const [events, setEvents] = useState<AdminEventWithId[] | undefined>(undefined);

  useEffect(() => {
    const eventsQuery = query(collection(db, 'events'), orderBy('startsAt', 'desc'));
    const unsubscribe = onSnapshot(eventsQuery, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Event<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setEvents(undefined);
    };
  }, []);

  return useMemo(() => ({ events: events ?? [], loading: events === undefined }), [events]);
}
