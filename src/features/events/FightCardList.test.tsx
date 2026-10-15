// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FightCardList } from './FightCardList.tsx';
import type { BoutWithId } from './hooks.ts';

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

describe('FightCardList', () => {
  it('lists only main-card bouts, with weight class and odds', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' }), bout({ id: 'b2', isMainCard: false })]}
        readOnly
      />,
    );
    expect(screen.getByText('Fighter A vs Fighter B')).toBeInTheDocument();
    expect(screen.getAllByText('Lightweight')).toHaveLength(1);
    expect(screen.getByText('−150')).toBeInTheDocument();
    expect(screen.getByText('+130')).toBeInTheDocument();
  });

  it('shows no pick summary when the pick is incomplete', () => {
    render(
      <FightCardList bouts={[bout({ id: 'b1' })]} picks={{ b1: { winner: 'A' } }} readOnly />,
    );
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  it('shows a pick summary with surname, method and stake once complete', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' })]}
        picks={{ b1: { winner: 'A', method: 'KO', stake: 200 } }}
        readOnly
      />,
    );
    expect(screen.getByText('✓ A · KO · 200')).toBeInTheDocument();
  });

  it('marks the lock bout with a lock icon', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' })]}
        picks={{ b1: { winner: 'A', method: 'KO', stake: 200 } }}
        lockBoutId="b1"
        readOnly
      />,
    );
    expect(screen.getByText('✓ A · KO · 200 · 🔒')).toBeInTheDocument();
  });

  it('calls onSelect with the bout id when a row is tapped and not read-only', () => {
    const onSelect = vi.fn();
    render(<FightCardList bouts={[bout({ id: 'b1' })]} readOnly={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('b1');
  });

  it('renders plain rows with no button when read-only', () => {
    render(<FightCardList bouts={[bout({ id: 'b1' })]} readOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a winning bout score as a positive total with a check', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' })]}
        picks={{ b1: { winner: 'A', method: 'KO', stake: 200 } }}
        scores={{ b1: 396 }}
        readOnly
      />,
    );
    const score = screen.getByText('+396 ✓');
    expect(score).toBeInTheDocument();
    expect(score).toHaveClass('text-win');
  });

  it('shows a losing bout score as a muted total with a cross', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' })]}
        picks={{ b1: { winner: 'A', method: 'KO', stake: 200 } }}
        scores={{ b1: -50 }}
        readOnly
      />,
    );
    const score = screen.getByText('-50 ✗');
    expect(score).toBeInTheDocument();
    expect(score).not.toHaveClass('text-win');
  });

  it('omits the score when the bout has not been scored yet', () => {
    render(
      <FightCardList
        bouts={[bout({ id: 'b1' })]}
        picks={{ b1: { winner: 'A', method: 'KO', stake: 200 } }}
        scores={{ b1: null }}
        readOnly
      />,
    );
    expect(screen.getByText('✓ A · KO · 200')).toBeInTheDocument();
  });
});
