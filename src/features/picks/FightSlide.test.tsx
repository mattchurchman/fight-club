// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FightSlide } from './FightSlide.tsx';
import type { BoutWithId } from '../events/hooks.ts';

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

function baseProps() {
  return {
    bout: bout(),
    pick: {},
    isLock: false,
    isLast: false,
    readOnly: false,
    attemptedSubmit: false,
    preview: null,
    minStake: 50,
    maxStake: 400,
    stakeStep: 25,
    onSelectWinner: vi.fn(),
    onSelectMethod: vi.fn(),
    onChangeStake: vi.fn(),
    onToggleLock: vi.fn(),
    onNext: vi.fn(),
  };
}

describe('FightSlide', () => {
  it('shows — for stake and no Next button on a fresh pick', () => {
    render(<FightSlide {...baseProps()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Next fight|Review picks/ }),
    ).not.toBeInTheDocument();
  });

  it('shows no red text when attemptedSubmit is false, even with an error message', () => {
    render(<FightSlide {...baseProps()} errorMessage="Pick a winner, a method and a stake." />);
    expect(screen.queryByText('Pick a winner, a method and a stake.')).not.toBeInTheDocument();
  });

  it('shows the error reason once attemptedSubmit is true', () => {
    render(
      <FightSlide
        {...baseProps()}
        attemptedSubmit={true}
        errorMessage="Pick a winner, a method and a stake."
      />,
    );
    expect(screen.getByText('Pick a winner, a method and a stake.')).toBeInTheDocument();
  });

  it('shows "Next fight →" once winner, method and stake are all set', () => {
    render(<FightSlide {...baseProps()} pick={{ winner: 'A', method: 'KO', stake: 100 }} />);
    expect(screen.getByRole('button', { name: 'Next fight →' })).toBeInTheDocument();
  });

  it('shows "Review picks →" on the last fight once complete', () => {
    render(
      <FightSlide
        {...baseProps()}
        isLast={true}
        pick={{ winner: 'A', method: 'KO', stake: 100 }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Review picks →' })).toBeInTheDocument();
  });

  it('calls onNext when the Next button is tapped', () => {
    const onNext = vi.fn();
    render(
      <FightSlide
        {...baseProps()}
        onNext={onNext}
        pick={{ winner: 'A', method: 'KO', stake: 100 }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next fight →' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('shows the "If right" preview in win color when complete', () => {
    render(
      <FightSlide
        {...baseProps()}
        pick={{ winner: 'A', method: 'KO', stake: 100 }}
        preview={250}
      />,
    );
    expect(screen.getByText('If right +250 pts')).toHaveClass('text-win');
  });

  it('shows the Main event tag only for the main event', () => {
    render(<FightSlide {...baseProps()} bout={bout({ isMainEvent: true })} />);
    expect(screen.getByText('Main event')).toBeInTheDocument();
  });

  it('calls onSelectMethod for the tapped chip', () => {
    const onSelectMethod = vi.fn();
    render(<FightSlide {...baseProps()} onSelectMethod={onSelectMethod} />);
    fireEvent.click(screen.getByRole('button', { name: 'SUB' }));
    expect(onSelectMethod).toHaveBeenCalledWith('SUB');
  });

  it('calls onToggleLock and reflects aria-pressed', () => {
    const onToggleLock = vi.fn();
    render(<FightSlide {...baseProps()} isLock={true} onToggleLock={onToggleLock} />);
    const toggle = screen.getByRole('button', { name: '🔒 Make this my lock' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(onToggleLock).toHaveBeenCalled();
  });
});

describe('FightSlide auto-advance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-advances 400ms after choosing a method on a fight that already has winner + stake', () => {
    const onNext = vi.fn();
    render(<FightSlide {...baseProps()} onNext={onNext} pick={{ winner: 'A', stake: 100 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'KO' }));
    expect(onNext).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('does not auto-advance when the winner or stake were not already set', () => {
    const onNext = vi.fn();
    render(<FightSlide {...baseProps()} onNext={onNext} pick={{ winner: 'A' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'KO' }));
    vi.advanceTimersByTime(1000);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not auto-advance under prefers-reduced-motion', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const onNext = vi.fn();
    render(<FightSlide {...baseProps()} onNext={onNext} pick={{ winner: 'A', stake: 100 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'KO' }));
    vi.advanceTimersByTime(1000);
    expect(onNext).not.toHaveBeenCalled();

    window.matchMedia = originalMatchMedia;
  });
});
