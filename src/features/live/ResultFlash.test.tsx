// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultFlash } from './ResultFlash.tsx';
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

afterEach(() => {
  vi.useRealTimers();
});

describe('ResultFlash', () => {
  it('shows the result title and subtitle', () => {
    render(<ResultFlash row={row()} self={null} onDismiss={() => {}} />);
    expect(screen.getByText('Soldić def. Williams')).toBeInTheDocument();
    expect(screen.getByText('Dec · R3')).toBeInTheDocument();
  });

  it('hides the delta/rank line for a viewer with no entry', () => {
    render(<ResultFlash row={row({ selfDelta: 466 })} self={null} onDismiss={() => {}} />);
    expect(screen.queryByText(/✓|✗/)).not.toBeInTheDocument();
  });

  it('shows a win delta and rank move in win color', () => {
    render(<ResultFlash row={row({ selfDelta: 466 })} self={{ rank: 2, move: 2 }} onDismiss={() => {}} />);
    expect(screen.getByText('+466 ✓')).toHaveClass('text-win');
    expect(screen.getByText('▲2 to #2')).toHaveClass('text-win');
  });

  it('shows a loss delta in muted color and no rank-move clause when unchanged', () => {
    render(<ResultFlash row={row({ selfDelta: 0 })} self={{ rank: 5, move: 0 }} onDismiss={() => {}} />);
    expect(screen.getByText('+0 ✗')).toHaveClass('text-muted');
    expect(screen.queryByText(/to #5/)).not.toBeInTheDocument();
  });

  it('dismisses on tap', () => {
    const onDismiss = vi.fn();
    render(<ResultFlash row={row()} self={null} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('status'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses itself after 2.5s', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<ResultFlash row={row()} self={null} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(2500);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
