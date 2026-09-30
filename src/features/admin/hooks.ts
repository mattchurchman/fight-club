// Live admin-only reads (docs/tasks/T17). `firestore.rules` gates each collection to `isAdmin()`
// (or wider), so these hooks are only ever mounted behind `RequireAdmin`.
import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { AllowlistEntry, AppConfig, JobRun, TokenRequest, User } from '@shared/index.ts';
import { DEFAULTS } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';

function useCollection<T>(name: string): { docs: (T & { id: string })[]; loading: boolean } {
  const [docs, setDocs] = useState<(T & { id: string })[] | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, name), (snapshot) => {
      setDocs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string }));
    });
    return () => {
      unsubscribe();
      setDocs(undefined);
    };
  }, [name]);

  return useMemo(() => ({ docs: docs ?? [], loading: docs === undefined }), [docs]);
}

export type AllowlistEntryWithId = AllowlistEntry<Timestamp> & { id: string };

export function useAllowlist(): { entries: AllowlistEntryWithId[]; loading: boolean } {
  const { docs, loading } = useCollection<AllowlistEntry<Timestamp>>('allowlist');
  return { entries: docs, loading };
}

export type UserWithId = User<Timestamp> & { id: string };

export function useAllUsers(): { users: UserWithId[]; loading: boolean } {
  const { docs, loading } = useCollection<User<Timestamp>>('users');
  return { users: docs, loading };
}

export type TokenRequestWithId = TokenRequest<Timestamp> & { id: string };

export function useAllTokenRequests(): { requests: TokenRequestWithId[]; loading: boolean } {
  const { docs, loading } = useCollection<TokenRequest<Timestamp>>('tokenRequests');
  return { requests: docs, loading };
}

const JOB_NAMES = ['ingest', 'odds', 'lifecycle'] as const;

/** A job that has never run has no `jobRuns` doc yet — `lastRunAt`/`ok` are null rather than absent. */
export interface JobRunSummary {
  id: (typeof JOB_NAMES)[number];
  lastRunAt: Timestamp | null;
  ok: boolean | null;
  summary: string;
  error: string | null;
}

export function useJobRuns(): { runs: JobRunSummary[]; loading: boolean } {
  const { docs, loading } = useCollection<JobRun<Timestamp>>('jobRuns');
  const runs = useMemo(() => {
    const byId = new Map(docs.map((d) => [d.id, d]));
    return JOB_NAMES.map((name): JobRunSummary => {
      const run = byId.get(name);
      return run
        ? { id: name, lastRunAt: run.lastRunAt, ok: run.ok, summary: run.summary, error: run.error }
        : { id: name, lastRunAt: null, ok: null, summary: '', error: null };
    });
  }, [docs]);
  return { runs, loading };
}

/** One-shot: the invite form's starting-grant default rarely changes and doesn't need a live listener. */
export function useAppDefaults(): number {
  const [startingGrant, setStartingGrant] = useState(DEFAULTS.startingGrant);
  useEffect(() => {
    void getDoc(doc(db, 'config', 'app')).then((snap) => {
      const config = snap.data() as AppConfig | undefined;
      if (config) setStartingGrant(config.defaults.startingGrant);
    });
  }, []);
  return startingGrant;
}
