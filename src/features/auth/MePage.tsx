import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import { auth, db } from '../../lib/firebase.ts';
import { useSession } from './SessionProvider.tsx';

// Module-scoped so a re-mount of this page (tab switch) doesn't re-write lastSeenAt; a full
// reload naturally resets it, which is what "once per session" means here.
const touchedThisSession = new Set<string>();

export function MePage() {
  const { user, profile } = useSession();

  useEffect(() => {
    if (!user || touchedThisSession.has(user.uid)) return;
    touchedThisSession.add(user.uid);
    void updateDoc(doc(db, 'users', user.uid), { lastSeenAt: serverTimestamp() }).catch(() => {});
  }, [user]);

  if (!user || !profile) return null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex flex-col items-center gap-3 py-6 text-center">
        <Avatar name={profile.displayName} src={profile.photoURL ?? undefined} size={72} />
        <div>
          <p className="font-display text-xl uppercase text-text">{profile.displayName}</p>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
        <TokenPill balance={profile.balance} />
      </Card>

      <Button variant="secondary" onClick={() => signOut(auth)}>
        Sign out
      </Button>
    </div>
  );
}
