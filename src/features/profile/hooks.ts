// Firestore reads for profiles & H2H (docs/tasks/T21). `firestore.rules` grants `read` on all of
// `users`, `usernames`, `events`, `events/*/entries/{the viewer's own uid is irrelevant here —
// everyone can read a *final* event's entries}` and `h2h` to any signed-in member, so every hook
// below is safe to mount for someone else's profile, not just your own.
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { Entry, Event, User } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';
import type { H2HDocLike } from './h2h.ts';

export interface UserWithId extends User<Timestamp> {
  id: string;
}

/** Every member, keyed by uid — resolves the other half of an H2H row or a standings link. */
export function useUsersById(): { byId: Record<string, UserWithId>; loading: boolean } {
  const [docs, setDocs] = useState<UserWithId[] | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as User<Timestamp>) })));
    });
    return () => {
      unsubscribe();
      setDocs(undefined);
    };
  }, []);

  return useMemo(() => {
    const byId: Record<string, UserWithId> = {};
    for (const user of docs ?? []) byId[user.id] = user;
    return { byId, loading: docs === undefined };
  }, [docs]);
}

/** undefined = loading, null = no such user — `/u/:username` can 404 either at this step or the next. */
export function useUidForUsername(usernameLower: string | null): string | null | undefined {
  const [uid, setUid] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!usernameLower) return undefined;
    let cancelled = false;
    void getDoc(doc(db, 'usernames', usernameLower)).then((snap) => {
      if (cancelled) return;
      const data = snap.data() as { uid: string } | undefined;
      setUid(data?.uid ?? null);
    });
    return () => {
      cancelled = true;
      setUid(undefined);
    };
  }, [usernameLower]);

  return usernameLower ? uid : null;
}

/** undefined = loading, null = no such user. */
export function useProfileUser(uid: string | null): UserWithId | null | undefined {
  const [user, setUser] = useState<UserWithId | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snap) => {
      setUser(snap.exists() ? { id: snap.id, ...(snap.data() as User<Timestamp>) } : null);
    });
    return () => {
      unsubscribe();
      setUser(undefined);
    };
  }, [uid]);

  return uid ? user : null;
}

/** Every H2H row touching `uid`, from either side of the sorted pair id. undefined = loading. */
export function useH2HFor(uid: string | null): H2HDocLike[] | undefined {
  const [asA, setAsA] = useState<H2HDocLike[] | undefined>(undefined);
  const [asB, setAsB] = useState<H2HDocLike[] | undefined>(undefined);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribe = onSnapshot(query(collection(db, 'h2h'), where('a', '==', uid)), (snap) => {
      setAsA(snap.docs.map((d) => d.data() as H2HDocLike));
    });
    return () => {
      unsubscribe();
      setAsA(undefined);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    const unsubscribe = onSnapshot(query(collection(db, 'h2h'), where('b', '==', uid)), (snap) => {
      setAsB(snap.docs.map((d) => d.data() as H2HDocLike));
    });
    return () => {
      unsubscribe();
      setAsB(undefined);
    };
  }, [uid]);

  return useMemo(() => {
    if (!uid || asA === undefined || asB === undefined) return undefined;
    return [...asA, ...asB];
  }, [uid, asA, asB]);
}

export interface EventHistoryRow {
  eventId: string;
  name: string;
  startsAtMs: number;
  seasonId: string;
  rank: number;
  points: number;
  payout: number;
}

/** docs/GAME_RULES.md §8: season = calendar year. */
function seasonIdFor(startsAtMs: number): string {
  return String(new Date(startsAtMs).getUTCFullYear());
}

/**
 * This player's finalized events, most recent first. One `getDoc` per final event — fine at this
 * app's scale (a handful of events a year), and simpler than denormalizing a reverse index.
 */
export function useEventHistory(uid: string | null): EventHistoryRow[] | undefined {
  const [rows, setRows] = useState<EventHistoryRow[] | undefined>(undefined);

  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;

    void (async () => {
      const eventsSnap = await getDocs(
        query(collection(db, 'events'), where('status', '==', 'final'), orderBy('startsAt', 'desc')),
      );
      const events = eventsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Event<Timestamp>) }));

      const entrySnaps = await Promise.all(
        events.map((event) => getDoc(doc(db, 'events', event.id, 'entries', uid))),
      );

      if (cancelled) return;
      const nextRows: EventHistoryRow[] = [];
      entrySnaps.forEach((snap, i) => {
        const event = events[i]!;
        if (!snap.exists()) return;
        const entry = snap.data() as Entry<Timestamp>;
        if (entry.rank === null || entry.score === null || entry.payout === null) return;
        nextRows.push({
          eventId: event.id,
          name: event.name,
          startsAtMs: event.startsAt.toMillis(),
          seasonId: seasonIdFor(event.startsAt.toMillis()),
          rank: entry.rank,
          points: entry.score.total,
          payout: entry.payout,
        });
      });
      setRows(nextRows);
    })();

    return () => {
      cancelled = true;
      setRows(undefined);
    };
  }, [uid]);

  return rows;
}
