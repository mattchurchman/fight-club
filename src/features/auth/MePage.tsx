import { useEffect, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { TokenPill } from '../../components/ui/TokenPill.tsx';
import { db } from '../../lib/firebase.ts';
import { AvatarUploadError, encodeAvatar } from '../profile/avatarUpload.ts';
import { useSession } from './SessionProvider.tsx';

// Module-scoped so a re-mount of this page (tab switch) doesn't re-write lastSeenAt; a full
// reload naturally resets it, which is what "once per session" means here.
const touchedThisSession = new Set<string>();

export function MePage() {
  const { user, profile } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || touchedThisSession.has(user.uid)) return;
    touchedThisSession.add(user.uid);
    void updateDoc(doc(db, 'users', user.uid), { lastSeenAt: serverTimestamp() }).catch(() => {});
  }, [user]);

  if (!user || !profile) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const photoURL = await encodeAvatar(file);
      await updateDoc(doc(db, 'users', user.uid), { photoURL });
    } catch (err) {
      setError(err instanceof AvatarUploadError ? err.message : "Couldn't update your photo.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db, 'users', user.uid), { photoURL: null });
    } catch {
      setError("Couldn't remove your photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="flex flex-col items-center gap-3 py-6 text-center">
        <Avatar name={profile.displayName} src={profile.photoURL ?? undefined} size={72} />
        <div>
          <p className="font-display text-xl uppercase text-text">{profile.displayName}</p>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
        <TokenPill balance={profile.balance} />
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            className="min-h-11"
            loading={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Change photo
          </Button>
          {profile.photoURL ? (
            <Button variant="ghost" className="min-h-11" disabled={busy} onClick={handleRemove}>
              Remove photo
            </Button>
          ) : null}
        </div>
        {error && <p className="text-sm text-red">{error}</p>}
      </Card>
    </div>
  );
}
