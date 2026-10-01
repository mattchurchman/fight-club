// Firestore reads for the Standings tab (docs/tasks/T21). `firestore.rules` grants `read` on
// `config/app`, `events` and `seasons/*/standings` to any signed-in member.
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import type { AppConfig, Event, Standing } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';
import { sortStandings } from './sort.ts';

/** undefined = loading, null = `config/app` is missing. */
export function useCurrentSeasonId(): string | null | undefined {
  const [seasonId, setSeasonId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (snap) => {
      const config = snap.data() as AppConfig | undefined;
      setSeasonId(config?.seasonId ?? null);
    });
    return () => {
      unsubscribe();
      setSeasonId(undefined);
    };
  }, []);

  return seasonId;
}

/**
 * Every calendar year an event has ever started in, plus the current season, most recent first.
 * One-shot: the set of past seasons only grows at fight-night pace, not worth a live listener.
 */
export function useSeasonIds(currentSeasonId: string | null): string[] {
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    void getDocs(collection(db, 'events')).then((snap) => {
      const found = new Set(
        snap.docs.map((d) => String(new Date((d.data() as Event<Timestamp>).startsAt.toMillis()).getUTCFullYear())),
      );
      setYears([...found]);
    });
  }, []);

  return useMemo(() => {
    const all = new Set(years);
    if (currentSeasonId) all.add(currentSeasonId);
    return [...all].sort((a, b) => b.localeCompare(a));
  }, [years, currentSeasonId]);
}

/** undefined = loading. Ranked per docs/GAME_RULES.md §8. */
export function useStandings(seasonId: string | null): Standing<Timestamp>[] | undefined {
  const [rows, setRows] = useState<Standing<Timestamp>[] | undefined>(undefined);

  useEffect(() => {
    if (!seasonId) return undefined;
    const unsubscribe = onSnapshot(collection(db, 'seasons', seasonId, 'standings'), (snap) => {
      setRows(snap.docs.map((d) => d.data() as Standing<Timestamp>));
    });
    return () => {
      unsubscribe();
      setRows(undefined);
    };
  }, [seasonId]);

  return useMemo(() => (rows ? sortStandings(rows) : undefined), [rows]);
}
