import { useEffect, useMemo, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import type { LedgerRow, TokenRequest } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';
import { useSession } from '../auth/SessionProvider';

export interface LedgerRowWithId extends LedgerRow<Timestamp> {
  id: string;
}

export interface TokenRequestWithId extends TokenRequest<Timestamp> {
  id: string;
}

export interface UseLedgerResult {
  rows: LedgerRowWithId[];
  loading: boolean;
}

export function useLedger(): UseLedgerResult {
  const { user } = useSession();
  const [rows, setRows] = useState<LedgerRowWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const uid = user.uid;

    const q = query(
      collection(db, 'ledger'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LedgerRowWithId[];
      setRows(data);
    });

    return () => {
      unsubscribe();
      setRows(undefined);
    };
  }, [user?.uid]);

  return useMemo(
    () => ({
      rows: rows ?? [],
      loading: rows === undefined,
    }),
    [rows],
  );
}

export interface UseTokenRequestsResult {
  requests: TokenRequestWithId[];
  loading: boolean;
}

export function useTokenRequests(): UseTokenRequestsResult {
  const { user } = useSession();
  const [requests, setRequests] = useState<TokenRequestWithId[] | undefined>(undefined);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const uid = user.uid;
    const q = query(
      collection(db, 'tokenRequests'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TokenRequestWithId[];
      setRequests(data);
    });

    return () => {
      unsubscribe();
      setRequests(undefined);
    };
  }, [user?.uid]);

  return useMemo(
    () => ({
      requests: requests ?? [],
      loading: requests === undefined,
    }),
    [requests],
  );
}
