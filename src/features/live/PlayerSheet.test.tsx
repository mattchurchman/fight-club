// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerSheet } from './PlayerSheet.tsx';
import type { EntryWithId } from './hooks.ts';
import type { BoutWithId } from '../events/hooks.ts';

// `PlayerSheet` joins live `usersById` (docs/tasks/T51) via `useUsersById`, which mounts a
// Firestore listener — stub it out rather than hitting the real SDK/IndexedDB in jsdom, and let
// tests control what it "reads" via `mockUserDocs`.
let mockUserDocs: Array<{ id: string; data: () => unknown }> = [];
vi.mock('../../lib/firebase.ts', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({}),
  onSnapshot: (_ref: unknown, next: (snap: { docs: typeof mockUserDocs }) => void) => {
    next({ docs: mockUserDocs });
    return () => {};
  },
}));

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id: 'b1',
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: true,
    isMainCard: true,
    a: { fighterId: 'f1', name: 'Tim Green', record: '10-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Lukas Ribovics', record: '9-1', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: true },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

function entry(overrides: Partial<EntryWithId> = {}): EntryWithId {
  return {
    id: 'u1',
    uid: 'u1',
    displayName: 'Matt',
    photoURL: null,
    picks: { b1: { winner: 'A', method: 'DEC', stake: 100 } },
    lockBoutId: '',
    firstBlood: null,
    status: 'submitted',
    submittedAt: ts,
    updatedAt: ts,
    charged: true,
    score: null,
    rank: null,
    payout: null,
    ...overrides,
  };
}

function renderSheet(props: Partial<Parameters<typeof PlayerSheet>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PlayerSheet entry={entry()} bouts={[bout()]} open onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('PlayerSheet', () => {
  beforeEach(() => {
    mockUserDocs = [];
  });

  it('shows "Pending" for an unresolved pick, not "…"', () => {
    renderSheet();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });

  it('shows ✓/✗ glyphs for resolved picks, both muted or win per DESIGN', () => {
    renderSheet({
      entry: entry({
        picks: { b1: { winner: 'A', method: 'DEC', stake: 100 } },
        score: { total: 10, byBout: { b1: { base: 100, method: 0, lock: 0, total: 100 } }, firstBlood: 0, correctWinners: 1, correctMethods: 0 },
      }),
      bouts: [bout({ status: 'final', result: { winner: 'A', method: 'DEC', round: 3, time: null, firstBlood: null, source: 'espn', updatedAt: ts } })],
    });
    expect(screen.getByText('✓')).toHaveClass('text-win');
  });

  it('links to the profile when a username is known', () => {
    renderSheet({ usernameByUid: { u1: 'matty' } });
    expect(screen.getByText('View profile')).toHaveAttribute('href', '/u/matty');
  });

  it('hides the link when no username is found', () => {
    renderSheet({ usernameByUid: {} });
    expect(screen.queryByText('View profile')).not.toBeInTheDocument();
  });

  it("prefers the live user doc's photoURL over the entry's denormalized copy", () => {
    mockUserDocs = [{ id: 'u1', data: () => ({ photoURL: 'fresh.png' }) }];
    renderSheet({ entry: entry({ photoURL: 'stale.png' }) });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'fresh.png');
  });
});
