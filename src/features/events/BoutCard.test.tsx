// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoutCard } from './BoutCard.tsx';
import type { BoutPickProps } from './BoutCard.tsx';
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

function pick(overrides: Partial<BoutPickProps> = {}): BoutPickProps {
  return {
    winner: undefined,
    method: undefined,
    stake: undefined,
    isLock: false,
    readOnly: false,
    preview: null,
    scoreTotal: null,
    onSelectWinner: vi.fn(),
    onSelectMethod: vi.fn(),
    onChangeStake: vi.fn(),
    onToggleLock: vi.fn(),
    ...overrides,
  };
}

describe('BoutCard pick mode', () => {
  it('calls onSelectWinner when a fighter half is tapped', () => {
    const onSelectWinner = vi.fn();
    render(<BoutCard bout={bout()} pick={pick({ onSelectWinner })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Fighter B' }));
    expect(onSelectWinner).toHaveBeenCalledWith('B');
  });

  it('shows a check mark on the picked fighter', () => {
    render(<BoutCard bout={bout()} pick={pick({ winner: 'A' })} />);
    expect(screen.getByRole('button', { name: 'Pick Fighter A' })).toHaveTextContent('✓');
    expect(screen.getByRole('button', { name: 'Pick Fighter B' })).not.toHaveTextContent('✓');
  });

  it('calls onSelectMethod for the tapped method chip', () => {
    const onSelectMethod = vi.fn();
    render(<BoutCard bout={bout()} pick={pick({ onSelectMethod })} />);
    fireEvent.click(screen.getByText('SUB'));
    expect(onSelectMethod).toHaveBeenCalledWith('SUB');
  });

  it('calls onToggleLock when the lock toggle is tapped', () => {
    const onToggleLock = vi.fn();
    render(<BoutCard bout={bout()} pick={pick({ onToggleLock })} />);
    fireEvent.click(screen.getByRole('button', { name: '🔒 Lock' }));
    expect(onToggleLock).toHaveBeenCalled();
  });

  it('shows the "if right" preview while editing', () => {
    render(<BoutCard bout={bout()} pick={pick({ preview: 700 })} />);
    expect(screen.getByText('If right: +700 pts')).toBeInTheDocument();
  });

  it('shows the actual score instead of the preview once the bout is scored', () => {
    render(<BoutCard bout={bout()} pick={pick({ preview: 700, scoreTotal: -150 })} />);
    expect(screen.getByText('-150 pts')).toBeInTheDocument();
    expect(screen.queryByText(/If right/)).not.toBeInTheDocument();
  });

  it('shows this bout\'s own validation error', () => {
    render(<BoutCard bout={bout()} pick={pick({ errorMessage: 'Pick a winner, a method and a stake.' })} />);
    expect(screen.getByText('Pick a winner, a method and a stake.')).toBeInTheDocument();
  });

  it('renders fighter halves as non-interactive once read-only, keeping the pick visible', () => {
    render(<BoutCard bout={bout()} pick={pick({ winner: 'A', method: 'KO', stake: 200, readOnly: true })} />);
    expect(screen.queryByRole('button', { name: 'Pick Fighter A' })).not.toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('disables the method chip and lock toggle, and shows a static stake instead of the stepper', () => {
    render(<BoutCard bout={bout()} pick={pick({ winner: 'A', method: 'KO', stake: 200, readOnly: true })} />);
    expect(screen.getByText('KO')).toBeDisabled();
    expect(screen.getByRole('button', { name: '🔒 Lock' })).toBeDisabled();
    expect(screen.getByText('Staked 200 pts')).toBeInTheDocument();
  });
});
