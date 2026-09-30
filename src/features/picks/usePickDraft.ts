import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { Corner, Entry, Method, ValidationResult } from '@shared/index.ts';
import { activeBoutIds, computeBudget, DEFAULTS, validateEntry } from '@shared/index.ts';
import { useSession } from '../auth/SessionProvider.tsx';
import { db } from '../../lib/firebase.ts';
import type { BoutWithId, EventWithId } from '../events/hooks.ts';
import { distributeStakes } from './autoBalance.ts';
import { clearDraft, loadDraft, saveDraft } from './draftStorage.ts';
import { draftReducer, EMPTY_DRAFT, toEntryDraft } from './draftReducer.ts';
import type { DraftState } from './draftReducer.ts';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export interface UsePickDraftResult {
  loading: boolean;
  /** True once picks can no longer be edited: window closed, entry voided, or a write got rejected. */
  readOnly: boolean;
  entry: Entry<Timestamp> | null;
  draft: DraftState;
  validation: ValidationResult;
  budget: number;
  allocated: number;
  activeBoutIds: string[];
  setWinner: (boutId: string, winner: Corner) => void;
  setMethod: (boutId: string, method: Method) => void;
  setStake: (boutId: string, stake: number) => void;
  setLock: (boutId: string) => void;
  setFirstBlood: (boutId: string, fighter: Corner) => void;
  autoBalance: () => void;
  submit: () => Promise<void>;
  submitting: boolean;
}

/**
 * Loads a player's entry (or a local draft while they're still building it) for one event, and
 * exposes the edit actions and live validation from `shared/validation.ts` (docs/tasks/T14).
 */
export function usePickDraft(
  eventId: string | null,
  event: EventWithId | null | undefined,
  bouts: BoutWithId[] | undefined,
): UsePickDraftResult {
  const { user, profile } = useSession();
  const uid = user?.uid ?? null;
  const now = useNow();

  const [entry, setEntry] = useState<Entry<Timestamp> | null | undefined>(undefined);
  useEffect(() => {
    if (!eventId || !uid) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'events', eventId, 'entries', uid), (snap) => {
      setEntry(snap.exists() ? (snap.data() as Entry<Timestamp>) : null);
    });
    return () => {
      unsubscribe();
      setEntry(undefined);
    };
  }, [eventId, uid]);

  const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!eventId || !uid || entry === undefined) return;
    const key = `${eventId}:${uid}`;
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;
    if (entry) {
      dispatch({
        type: 'hydrate',
        draft: { picks: entry.picks, lockBoutId: entry.lockBoutId, firstBlood: entry.firstBlood },
      });
    } else {
      dispatch({ type: 'hydrate', draft: loadDraft(eventId, uid) ?? EMPTY_DRAFT });
    }
  }, [eventId, uid, entry]);

  useEffect(() => {
    if (!eventId || !uid || hydratedFor.current !== `${eventId}:${uid}`) return;
    saveDraft(eventId, uid, draft);
  }, [eventId, uid, draft]);

  const boutsRecord = useMemo(
    () => Object.fromEntries((bouts ?? []).map((bout) => [bout.id, bout])),
    [bouts],
  );
  const active = useMemo(() => activeBoutIds(boutsRecord), [boutsRecord]);
  const budget = event ? computeBudget(active.length, { ...DEFAULTS, budget: event.budget }) : 0;
  const allocated = active.reduce((sum, boutId) => {
    const stake = draft.picks[boutId]?.stake;
    return sum + (typeof stake === 'number' ? stake : 0);
  }, 0);

  const validation: ValidationResult = event
    ? validateEntry(toEntryDraft(draft), boutsRecord, {
        budget: event.budget,
        firstBloodEnabled: event.firstBloodEnabled,
      })
    : { ok: false, errors: [] };

  const [forceReadOnly, setForceReadOnly] = useState(false);
  const windowOpen = !!event && event.status === 'open' && now < event.lockAt.toMillis();
  const readOnly = forceReadOnly || !windowOpen || entry?.status === 'void';

  const setWinner = useCallback(
    (boutId: string, winner: Corner) => dispatch({ type: 'setWinner', boutId, winner }),
    [],
  );
  const setMethod = useCallback(
    (boutId: string, method: Method) => dispatch({ type: 'setMethod', boutId, method }),
    [],
  );
  const setStake = useCallback(
    (boutId: string, stake: number) => dispatch({ type: 'setStake', boutId, stake }),
    [],
  );
  const setLock = useCallback((boutId: string) => dispatch({ type: 'setLock', boutId }), []);
  const setFirstBlood = useCallback(
    (boutId: string, fighter: Corner) => dispatch({ type: 'setFirstBlood', boutId, fighter }),
    [],
  );

  const autoBalance = useCallback(() => {
    const withoutStake = active.filter((boutId) => typeof draft.picks[boutId]?.stake !== 'number');
    if (withoutStake.length === 0) return;
    const staked = active.reduce((sum, boutId) => {
      const stake = draft.picks[boutId]?.stake;
      return sum + (typeof stake === 'number' ? stake : 0);
    }, 0);
    const stakes = distributeStakes(withoutStake, budget - staked, DEFAULTS);
    dispatch({ type: 'autoBalance', stakes });
  }, [active, draft, budget]);

  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(async () => {
    if (!eventId || !uid || !profile || !validation.ok) return;
    setSubmitting(true);
    try {
      const ref = doc(db, 'events', eventId, 'entries', uid);
      if (!entry) {
        await setDoc(ref, {
          uid,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          picks: draft.picks,
          lockBoutId: draft.lockBoutId,
          firstBlood: draft.firstBlood,
          status: 'submitted',
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          charged: false,
          score: null,
          rank: null,
          payout: null,
        });
      } else {
        await updateDoc(ref, {
          picks: draft.picks,
          lockBoutId: draft.lockBoutId,
          firstBlood: draft.firstBlood,
          updatedAt: serverTimestamp(),
        });
      }
      clearDraft(eventId, uid);
    } catch (error) {
      // The window can close between our last render and the write reaching Firestore
      // (clock skew, or the lifecycle job locking it moments ago); the rules reject it either
      // way, so treat any failure here as "you're too late" rather than surfacing raw errors.
      setForceReadOnly(true);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [eventId, uid, profile, entry, draft, validation.ok]);

  return {
    loading: entry === undefined,
    readOnly,
    entry: entry ?? null,
    draft,
    validation,
    budget,
    allocated,
    activeBoutIds: active,
    setWinner,
    setMethod,
    setStake,
    setLock,
    setFirstBlood,
    autoBalance,
    submit,
    submitting,
  };
}
