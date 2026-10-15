// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultsList } from './ResultsList.tsx';
import type { ResultFeedRow } from './derive.ts';

function row(overrides: Partial<ResultFeedRow> = {}): ResultFeedRow {
  return {
    boutId: 'b1',
    winnerName: 'Ante Soldić',
    loserName: 'Josh Williams',
    method: 'DEC',
    round: 3,
    pickedWinner: 4,
    total: 6,
    selfDelta: null,
    ...overrides,
  };
}

describe('ResultsList', () => {
  it('renders nothing with an empty feed', () => {
    const { container } = render(<ResultsList feed={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "<winner> def. <loser>" with method, round and consensus', () => {
    render(<ResultsList feed={[row()]} />);
    expect(screen.getByText('Soldić def. Williams')).toBeInTheDocument();
    expect(screen.getByText('Dec · R3 · 4 of 6 had Soldić')).toBeInTheDocument();
  });

  it('appends your delta, in win color when positive', () => {
    render(<ResultsList feed={[row({ selfDelta: 466 })]} />);
    expect(screen.getByText('you +466')).toHaveClass('text-win');

    render(<ResultsList feed={[row({ boutId: 'b2', selfDelta: 0 })]} />);
    expect(screen.getByText('you +0')).not.toHaveClass('text-win');
  });

  it('labels a draw/no-contest without a "def." clause', () => {
    render(<ResultsList feed={[row({ winnerName: 'Draw', loserName: null, pickedWinner: 0 })]} />);
    expect(screen.getByText('Draw')).toBeInTheDocument();
  });
});
