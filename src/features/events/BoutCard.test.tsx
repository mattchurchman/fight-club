// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BoutCard } from './BoutCard.tsx';
import type { BoutWithId } from './hooks.ts';

// BoutCard never reads `updatedAt`, so a bare `.toMillis()` stub is enough here.
const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<BoutWithId> = {}): BoutWithId {
  return {
    id: 'bout_1',
    order: 2,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: false },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

describe('BoutCard', () => {
  it('formats American odds and the implied probability for each fighter', () => {
    render(<BoutCard bout={bout()} />);
    expect(screen.getByText('−150')).toBeInTheDocument();
    expect(screen.getByText('+130')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument(); // implied(-150) = 150/250
    expect(screen.getByText('43%')).toBeInTheDocument(); // implied(+130) = 100/230
  });

  it('shows a placeholder instead of odds when none are set yet', () => {
    render(<BoutCard bout={bout({ odds: { a: null, b: null, source: 'default', updatedAt: ts, frozen: false } })} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows the Main Event ribbon only for the main event', () => {
    render(<BoutCard bout={bout({ isMainEvent: true })} />);
    expect(screen.getByText('Main Event')).toBeInTheDocument();
  });

  it('omits the Main Event ribbon for other bouts', () => {
    render(<BoutCard bout={bout({ isMainEvent: false })} />);
    expect(screen.queryByText('Main Event')).not.toBeInTheDocument();
  });

  it('renders a method/round/time summary once a bout is final', () => {
    render(
      <BoutCard
        bout={bout({
          status: 'final',
          result: { winner: 'A', method: 'KO', round: 2, time: '1:34', firstBlood: null, source: 'espn', updatedAt: ts },
        })}
      />,
    );
    expect(screen.getByText('KO/TKO · R2 · 1:34')).toBeInTheDocument();
  });

  it('labels a draw without picking a winner side', () => {
    render(
      <BoutCard
        bout={bout({
          status: 'final',
          result: { winner: 'draw', method: 'DEC', round: 3, time: null, firstBlood: null, source: 'espn', updatedAt: ts },
        })}
      />,
    );
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });

  it('shows a live badge for a bout in progress', () => {
    render(<BoutCard bout={bout({ status: 'live' })} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('falls back to initials when a fighter has no headshot', () => {
    render(<BoutCard bout={bout()} />);
    expect(screen.getByLabelText('Fighter A')).toHaveTextContent('FA');
    expect(screen.getByLabelText('Fighter B')).toHaveTextContent('FB');
  });
});
