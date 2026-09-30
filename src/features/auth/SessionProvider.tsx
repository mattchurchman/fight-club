import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as UserProfile } from '@shared/index.ts';
import { auth, db } from '../../lib/firebase.ts';

export type SessionStatus = 'loading' | 'signedOut' | 'notInvited' | 'needsProfile' | 'ready';

export interface Session {
  status: SessionStatus;
  user: FirebaseUser | null;
  profile: UserProfile<Timestamp> | null;
  isAdmin: boolean;
}

interface DeriveInput {
  authUser: FirebaseUser | null | undefined; // undefined = auth state not resolved yet
  invited: boolean | undefined; // undefined = allowlist not checked yet
  profile: UserProfile<Timestamp> | null | undefined; // undefined = profile not checked yet
  admins: string[];
}

/** Pure state machine, kept separate from the Firestore listeners so it's trivial to unit test. */
export function deriveSession({ authUser, invited, profile, admins }: DeriveInput): Session {
  if (authUser === undefined) {
    return { status: 'loading', user: null, profile: null, isAdmin: false };
  }
  if (authUser === null) {
    return { status: 'signedOut', user: null, profile: null, isAdmin: false };
  }
  if (invited === undefined) {
    return { status: 'loading', user: authUser, profile: null, isAdmin: false };
  }
  if (!invited) {
    return { status: 'notInvited', user: authUser, profile: null, isAdmin: false };
  }
  const isAdmin = admins.includes(authUser.uid);
  if (profile === undefined) {
    return { status: 'loading', user: authUser, profile: null, isAdmin };
  }
  if (!profile) {
    return { status: 'needsProfile', user: authUser, profile: null, isAdmin };
  }
  return { status: 'ready', user: authUser, profile, isAdmin };
}

const SessionContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<FirebaseUser | null | undefined>(undefined);
  const [invited, setInvited] = useState<boolean | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile<Timestamp> | null | undefined>(undefined);
  const [admins, setAdmins] = useState<string[]>([]);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  // config/app is only readable once signed in, so this has to key off authUser like the other
  // listeners: a listener that started while signed out gets a permanent permission-denied and
  // never recovers, even after sign-in, unless it's torn down and recreated (Firestore JS SDK
  // doesn't auto-resubscribe past that error). isAdmin only ever consults this, never
  // `users/{uid}.role` (see firestore.rules).
  useEffect(() => {
    if (!authUser) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (snap) => {
      const data = snap.data() as { admins?: string[] } | undefined;
      setAdmins(data?.admins ?? []);
    });
    return () => {
      unsubscribe();
      setAdmins([]);
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return undefined;
    // Firebase Auth always gives Google/email-password users a real email; 'none' is an
    // unreachable placeholder doc id so the branch still resolves through the same async path.
    const emailLower = (authUser.email ?? '').toLowerCase() || 'none';
    const unsubscribe = onSnapshot(doc(db, 'allowlist', emailLower), (snap) =>
      setInvited(snap.exists()),
    );
    return () => {
      unsubscribe();
      setInvited(undefined);
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return undefined;
    const unsubscribe = onSnapshot(doc(db, 'users', authUser.uid), (snap) =>
      setProfile(snap.exists() ? (snap.data() as UserProfile<Timestamp>) : null),
    );
    return () => {
      unsubscribe();
      setProfile(undefined);
    };
  }, [authUser]);

  const session = deriveSession({ authUser, invited, profile, admins });

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used within <AuthProvider>');
  return session;
}
