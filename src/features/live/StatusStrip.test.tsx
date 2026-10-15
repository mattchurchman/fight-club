// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import type { Bout } from '@shared/index.ts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusStrip } from './StatusStrip.tsx';
import type { EventWithId } from '../events/hooks.ts';

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function event(overrides: Partial<EventWithId> = {}): EventWithId {
  return {
    id: 'evt_1',
    name: 'UFC 300',
    subtitle: null,
    number: 300,
    kind: 'numbered',
    enabled: true,
    startsAt: ts,
    lockAt: ts,
    status: 'live',
    buyIn: 100,
    budget: 1000,
    firstBloodEnabled: false,
    mainCardBoutIds: [],
    paidEntrants: 6,
    pot: 600,
    venue: null,
    source: 'espn',
    espnId: 'espn_1',
    updatedAt: ts,
    finalizedAt: null,
    rulesVersion: 'v1',
    ...overrides,
  };
}

function bout(overrides: Partial<Bout<Timestamp>> = {}): Bout<Timestamp> {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'f1', name: 'Fighter A', record: '10-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Fighter B', record: '9-1', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: true },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

const RESULT = {
  winner: 'A' as const,
  method: 'DEC' as const,
  round: 3,
  time: '5:00',
  firstBlood: null,
  source: 'espn' as const,
  updatedAt: ts,
};

describe('StatusStrip', () => {
  it('shows the fight-in-progress position and pot', () => {
    const bouts = {
      b1: bout({ order: 3, result: RESULT, status: 'final' }),
      b2: bout({ order: 2, result: RESULT, status: 'final' }),
      b3: bout({ order: 1 }),
    };
    render(<StatusStrip event={event()} bouts={bouts} />);
    expect(screen.getByText('Fight 3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Pot')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });

  it('shows "Pot paid" once the event is final', () => {
    render(<StatusStrip event={event({ status: 'final' })} bouts={{ b1: bout() }} />);
    expect(screen.getByText('Pot paid')).toBeInTheDocument();
    expect(screen.queryByText(/Fight \d/)).not.toBeInTheDocument();
  });
});
