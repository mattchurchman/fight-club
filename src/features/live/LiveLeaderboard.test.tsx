// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EntryScore } from '@shared/index.ts';
import { LiveLeaderboard } from './LiveLeaderboard.tsx';
import type { LiveLeaderboardEntry } from './LiveLeaderboard.tsx';
import type { BoutWithId } from '../events/hooks.ts';

vi.mock('../auth/SessionProvider.tsx', () => ({
  useSession: () => ({ user: { uid: 'me' } }),
}));

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id: 'b1',
    order: 2,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'f1', name: 'Tim Green', record: '10-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Lukas Ribovics', record: '9-1', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: true },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

function score(overrides: Partial<EntryScore> = {}): EntryScore {
  return { total: 0, byBout: {}, firstBlood: 0, correctWinners: 0, correctMethods: 0, ...overrides };
}

function entry(uid: string, overrides: Partial<LiveLeaderboardEntry> = {}): LiveLeaderboardEntry {
  return {
    uid,
    displayName: uid,
    photoURL: null,
    status: 'submitted',
    picks: {},
    score: null,
    payout: null,
    ...overrides,
  };
}

describe('LiveLeaderboard', () => {
  it('shows an F1/F2 header matching fight order and marks per bout', () => {
    const b1 = bout({ id: 'b1', order: 2 });
    const b2 = bout({ id: 'b2', order: 1, isMainEvent: true });
    render(
      <LiveLeaderboard
        entries={[entry('me', { score: score({ total: 10 }) })]}
        bouts={[b1, b2]}
        moves={{}}
        final={false}
        onTap={vi.fn()}
      />,
    );
    expect(screen.getByText('F1')).toBeInTheDocument();
    expect(screen.getByText('F2')).toBeInTheDocument();
  });

  it('marks a win as ✓ and a loss as ✗, in fight order', () => {
    const b1 = bout({
      id: 'b1',
      order: 2,
      result: { winner: 'A', method: 'DEC', round: 3, time: null, firstBlood: null, source: 'espn', updatedAt: ts },
      status: 'final',
    });
    const b2 = bout({
      id: 'b2',
      order: 1,
      isMainEvent: true,
      result: { winner: 'B', method: 'KO', round: 1, time: null, firstBlood: null, source: 'espn', updatedAt: ts },
      status: 'final',
    });
    render(
      <LiveLeaderboard
        entries={[
          entry('me', {
            picks: { b1: { winner: 'A', method: 'DEC', stake: 100 }, b2: { winner: 'A', method: 'DEC', stake: 100 } },
            score: score({ total: 10 }),
          }),
        ]}
        bouts={[b1, b2]}
        moves={{}}
        final={false}
        onTap={vi.fn()}
      />,
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('shows rank movement glyphs', () => {
    render(
      <LiveLeaderboard
        entries={[entry('me', { score: score({ total: 10 }) }), entry('other', { score: score({ total: 5 }) })]}
        bouts={[]}
        moves={{ me: 1, other: -1 }}
        final={false}
        onTap={vi.fn()}
      />,
    );
    expect(screen.getByText('▲1')).toBeInTheDocument();
    expect(screen.getByText('▼1')).toBeInTheDocument();
  });

  it('adds a payout column once the event is final', () => {
    render(
      <LiveLeaderboard
        entries={[entry('me', { score: score({ total: 10 }), payout: 150 }), entry('other', { payout: null })]}
        bouts={[]}
        moves={{}}
        final
        onTap={vi.fn()}
      />,
    );
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('calls onTap with the uid when a row is clicked', () => {
    const onTap = vi.fn();
    render(
      <LiveLeaderboard entries={[entry('me', { score: score({ total: 10 }) })]} bouts={[]} moves={{}} final={false} onTap={onTap} />,
    );
    screen.getByText('me').closest('button')!.click();
    expect(onTap).toHaveBeenCalledWith('me');
  });
});
