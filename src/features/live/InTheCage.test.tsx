// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InTheCage } from './InTheCage.tsx';
import type { SwingLine } from './derive.ts';
import type { EntryWithId } from './hooks.ts';
import type { BoutWithId } from '../events/hooks.ts';

vi.mock('../auth/SessionProvider.tsx', () => ({
  useSession: () => ({ user: null }),
}));

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id: 'bout_1',
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
    picks: {},
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

describe('InTheCage', () => {
  it('renders nothing when there is no current bout', () => {
    const { container } = render(
      <InTheCage bout={null} entries={[]} swing={[]} hasResults={false} onTap={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Up next" before any result, and groups pickers by side with locks marked', () => {
    const onTap = vi.fn();
    const entries = [
      entry({ uid: 'u1', displayName: 'Tony', picks: { bout_1: { winner: 'A', method: 'DEC', stake: 100 } }, lockBoutId: 'bout_1' }),
      entry({ uid: 'u2', displayName: 'Andre', picks: { bout_1: { winner: 'B', method: 'KO', stake: 50 } } }),
    ];
    render(<InTheCage bout={bout()} entries={entries} swing={[]} hasResults={false} onTap={onTap} />);

    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.getByText('Green')).toBeInTheDocument();
    expect(screen.getByText('Ribovics')).toBeInTheDocument();
    expect(screen.getByText('Tony')).toBeInTheDocument();
    expect(screen.getByLabelText('Lock of the night')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tony'));
    expect(onTap).toHaveBeenCalledWith('u1');
  });

  it('shows at most 6 pickers per side, collapsing the rest into a "+N more" line', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry({
        uid: `u${i}`,
        displayName: `Friend ${i}`,
        picks: { bout_1: { winner: 'A', method: 'DEC', stake: 100 } },
      }),
    );
    render(<InTheCage bout={bout()} entries={entries} swing={[]} hasResults={false} onTap={vi.fn()} />);

    expect(screen.getByText('Friend 0')).toBeInTheDocument();
    expect(screen.getByText('Friend 5')).toBeInTheDocument();
    expect(screen.queryByText('Friend 6')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('switches the heading to "In the cage" once results exist, and renders swing lines', () => {
    const swing: SwingLine[] = [
      { side: 'A', fighterName: 'Tim Green', self: { rank: 3, delta: 160 }, newLeader: null },
      { side: 'B', fighterName: 'Lukas Ribovics', self: null, newLeader: { uid: 'u3', name: 'Tony' } },
    ];
    render(<InTheCage bout={bout()} entries={[]} swing={swing} hasResults onTap={vi.fn()} />);

    expect(screen.getByText('In the cage')).toBeInTheDocument();
    expect(screen.getByText('If Green wins: you → 3rd (+160)')).toBeInTheDocument();
    expect(screen.getByText('If Ribovics wins: Tony takes 1st')).toBeInTheDocument();
  });
});
