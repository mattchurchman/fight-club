// @vitest-environment jsdom
import type { User as FirebaseUser } from 'firebase/auth';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveSession, useSession } from './SessionProvider.tsx';

const fakeUser = { uid: 'u1', email: 'player@example.com' } as FirebaseUser;

describe('deriveSession (state machine)', () => {
  it('is loading until auth state resolves', () => {
    expect(deriveSession({ authUser: undefined, invited: undefined, profile: undefined, admins: [] }))
      .toMatchObject({ status: 'loading' });
  });

  it('is signedOut when there is no auth user', () => {
    expect(deriveSession({ authUser: null, invited: undefined, profile: undefined, admins: [] }))
      .toMatchObject({ status: 'signedOut' });
  });

  it('is loading while the allowlist check is in flight', () => {
    expect(
      deriveSession({ authUser: fakeUser, invited: undefined, profile: undefined, admins: [] }),
    ).toMatchObject({ status: 'loading' });
  });

  it('is notInvited when the email is not on the allowlist', () => {
    expect(
      deriveSession({ authUser: fakeUser, invited: false, profile: undefined, admins: [] }),
    ).toMatchObject({ status: 'notInvited' });
  });

  it('is loading while the profile check is in flight', () => {
    expect(
      deriveSession({ authUser: fakeUser, invited: true, profile: undefined, admins: [] }),
    ).toMatchObject({ status: 'loading' });
  });

  it('is needsProfile once invited but no profile doc exists', () => {
    expect(deriveSession({ authUser: fakeUser, invited: true, profile: null, admins: [] })).toMatchObject({
      status: 'needsProfile',
    });
  });

  it('is ready once invited with a profile', () => {
    const profile = { displayName: 'Matt' } as never;
    const result = deriveSession({ authUser: fakeUser, invited: true, profile, admins: [] });
    expect(result.status).toBe('ready');
    expect(result.profile).toBe(profile);
  });

  it('derives isAdmin from config/app.admins, not the profile', () => {
    const result = deriveSession({
      authUser: fakeUser,
      invited: true,
      profile: null,
      admins: ['u1'],
    });
    expect(result.isAdmin).toBe(true);
    expect(deriveSession({ authUser: fakeUser, invited: true, profile: null, admins: ['other'] }).isAdmin).toBe(
      false,
    );
  });
});

const authListeners = new Set<(user: FirebaseUser | null) => void>();
const snapshotListeners = new Map<string, Set<(snap: unknown) => void>>();

function emitAuth(user: FirebaseUser | null) {
  for (const cb of authListeners) cb(user);
}

function emitSnapshot(path: string, data: Record<string, unknown> | undefined) {
  const listeners = snapshotListeners.get(path);
  if (!listeners) return;
  for (const cb of listeners) cb({ exists: () => data !== undefined, data: () => data });
}

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: FirebaseUser | null) => void) => {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  onSnapshot: (path: string, cb: (snap: unknown) => void) => {
    const set = snapshotListeners.get(path) ?? new Set();
    set.add(cb);
    snapshotListeners.set(path, set);
    return () => set.delete(cb);
  },
}));

vi.mock('../../lib/firebase.ts', () => ({ auth: {}, db: {} }));

function Probe() {
  const session = useSession();
  return <div data-testid="status">{session.status}</div>;
}

describe('AuthProvider (wired to Firestore listeners)', () => {
  beforeEach(() => {
    authListeners.clear();
    snapshotListeners.clear();
  });

  it('walks signedOut -> notInvited -> needsProfile -> ready as data arrives', async () => {
    const { AuthProvider } = await import('./SessionProvider.tsx');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await act(async () => emitAuth(null));
    expect(screen.getByTestId('status').textContent).toBe('signedOut');

    await act(async () => emitAuth(fakeUser));
    expect(screen.getByTestId('status').textContent).toBe('loading');

    await act(async () => emitSnapshot('allowlist/player@example.com', undefined));
    expect(screen.getByTestId('status').textContent).toBe('notInvited');

    await act(async () => emitSnapshot('allowlist/player@example.com', { role: 'player' }));
    expect(screen.getByTestId('status').textContent).toBe('loading');

    await act(async () => emitSnapshot('users/u1', undefined));
    expect(screen.getByTestId('status').textContent).toBe('needsProfile');

    await act(async () => emitSnapshot('users/u1', { displayName: 'Matt' }));
    expect(screen.getByTestId('status').textContent).toBe('ready');
  });
});
