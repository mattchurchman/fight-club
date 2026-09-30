import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import { db } from '../../lib/firebase.ts';
import { normalizeUsername, usernameFormatError } from './username.ts';
import { useSession } from './SessionProvider.tsx';

type Availability = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

const inputClasses =
  'min-h-11 rounded-xl border border-line bg-surface-2 px-3 text-text placeholder:text-muted';

export function OnboardingPage() {
  const { user } = useSession();
  const { show } = useToast();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeUsername(username);
  const formatError = normalized ? usernameFormatError(normalized) : null;

  // The idle/invalid states are pure functions of `username`, computed during render; only the
  // debounced lookup result needs state, and it's only ever set from the async callback below
  // (never synchronously in the effect body).
  const [lookup, setLookup] = useState<{ for: string; result: 'available' | 'taken' } | null>(null);

  useEffect(() => {
    if (!normalized || formatError) return undefined;
    const timer = setTimeout(() => {
      void getDoc(doc(db, 'usernames', normalized)).then((snap) => {
        setLookup({ for: normalized, result: snap.exists() ? 'taken' : 'available' });
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [normalized, formatError]);

  const availability: Availability = !normalized
    ? 'idle'
    : formatError
      ? 'invalid'
      : lookup?.for === normalized
        ? lookup.result
        : 'checking';

  const trimmedName = displayName.trim();
  const canSubmit =
    !submitting && availability === 'available' && trimmedName.length > 0 && trimmedName.length <= 40;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid), {
        displayName: trimmedName,
        username: normalized,
        usernameLower: normalized,
        photoURL: user.photoURL ?? null,
        email: user.email ?? '',
        role: 'player',
        balance: 0,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
      });
      batch.set(doc(db, 'usernames', normalized), { uid: user.uid });
      await batch.commit();
    } catch {
      setError('Could not create your profile. Please try again.');
      show('Something went wrong creating your profile.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const hint =
    availability === 'invalid'
      ? formatError
      : availability === 'taken'
        ? 'That username is taken.'
        : availability === 'available'
          ? 'Available!'
          : availability === 'checking'
            ? 'Checking…'
            : null;

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar name={trimmedName || user?.email || '?'} src={user?.photoURL ?? undefined} size={64} />
        <div>
          <h1 className="font-display text-2xl uppercase text-text">Set up your profile</h1>
          <p className="text-sm text-muted">Pick a username your friends will recognize.</p>
        </div>
      </div>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="mattc"
              className={inputClasses}
            />
            {hint ? (
              <span
                className={clsx(
                  'text-xs',
                  availability === 'available' ? 'text-win' : 'text-muted',
                  (availability === 'taken' || availability === 'invalid') && 'text-loss',
                )}
              >
                {hint}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm text-muted">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              placeholder="Matt Churchman"
              className={inputClasses}
            />
          </label>

          {error ? (
            <p className="text-sm text-loss" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            Enter Fight Club
          </Button>
        </form>
      </Card>
    </div>
  );
}
