// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewSlide } from './ReviewSlide.tsx';
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
    a: { fighterId: 'ftr_a', name: 'Alexandre Pantoja', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: -150, b: 130, source: 'espn', updatedAt: ts, frozen: false },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

function baseProps() {
  return {
    bouts: [bout()],
    picks: {},
    lockBoutId: null,
    readOnly: false,
    minStake: 50,
    maxStake: 400,
    stakeStep: 25,
    onJumpToBout: vi.fn(),
    onChangeStake: vi.fn(),
    onToggleLock: vi.fn(),
    firstBloodEnabled: false,
    firstBlood: null,
    onChangeFirstBlood: vi.fn(),
    onAutoBalance: vi.fn(),
    submitLabel: 'Submit picks',
    submitReady: true,
    submitting: false,
    onSubmit: vi.fn(),
  };
}

describe('ReviewSlide', () => {
  it('shows "Not picked" for an incomplete fight', () => {
    render(<ReviewSlide {...baseProps()} />);
    expect(screen.getByText('Not picked')).toBeInTheDocument();
  });

  it('jumps to the slide when an unpicked row is tapped', () => {
    const onJumpToBout = vi.fn();
    render(<ReviewSlide {...baseProps()} onJumpToBout={onJumpToBout} />);
    fireEvent.click(screen.getByText('Alexandre Pantoja vs Fighter B'));
    expect(onJumpToBout).toHaveBeenCalledWith('bout_1');
  });

  it('shows the picked fighter\'s surname and method once complete', () => {
    render(
      <ReviewSlide
        {...baseProps()}
        picks={{ bout_1: { winner: 'A', method: 'KO', stake: 200 } }}
      />,
    );
    expect(screen.getByText('Pantoja')).toBeInTheDocument();
    expect(screen.getByText('KO')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('jumps to the slide when the picked name is tapped', () => {
    const onJumpToBout = vi.fn();
    render(
      <ReviewSlide
        {...baseProps()}
        onJumpToBout={onJumpToBout}
        picks={{ bout_1: { winner: 'A', method: 'KO', stake: 200 } }}
      />,
    );
    fireEvent.click(screen.getByText('Pantoja'));
    expect(onJumpToBout).toHaveBeenCalledWith('bout_1');
  });

  it('steps the stake up and down by the given step, clamped to the range', () => {
    const onChangeStake = vi.fn();
    render(
      <ReviewSlide
        {...baseProps()}
        onChangeStake={onChangeStake}
        picks={{ bout_1: { winner: 'A', method: 'KO', stake: 400 } }}
      />,
    );
    expect(screen.getByLabelText('Increase stake for Pantoja')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Decrease stake for Pantoja'));
    expect(onChangeStake).toHaveBeenCalledWith('bout_1', 375);
  });

  it('toggles the lock for a row and reflects aria-pressed', () => {
    const onToggleLock = vi.fn();
    render(
      <ReviewSlide
        {...baseProps()}
        onToggleLock={onToggleLock}
        lockBoutId="bout_1"
        picks={{ bout_1: { winner: 'A', method: 'KO', stake: 200 } }}
      />,
    );
    const lockButton = screen.getByLabelText('Lock Pantoja');
    expect(lockButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(lockButton);
    expect(onToggleLock).toHaveBeenCalledWith('bout_1');
  });

  it('calls onAutoBalance when Auto-balance is tapped', () => {
    const onAutoBalance = vi.fn();
    render(<ReviewSlide {...baseProps()} onAutoBalance={onAutoBalance} />);
    fireEvent.click(screen.getByRole('button', { name: 'Auto-balance' }));
    expect(onAutoBalance).toHaveBeenCalled();
  });

  it('shows the given submit label and calls onSubmit when tapped', () => {
    const onSubmit = vi.fn();
    render(<ReviewSlide {...baseProps()} submitLabel="Choose your lock" onSubmit={onSubmit} />);
    const button = screen.getByRole('button', { name: 'Choose your lock' });
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('marks the submit button aria-disabled, but still clickable, when not ready', () => {
    render(<ReviewSlide {...baseProps()} submitLabel="Pick 1 more fights" submitReady={false} />);
    const button = screen.getByRole('button', { name: 'Pick 1 more fights' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('hides Auto-balance and Submit once read-only', () => {
    render(<ReviewSlide {...baseProps()} readOnly />);
    expect(screen.queryByRole('button', { name: 'Auto-balance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit picks' })).not.toBeInTheDocument();
  });

  it('shows the First Blood picker only when the event enables it', () => {
    render(<ReviewSlide {...baseProps()} firstBloodEnabled />);
    expect(screen.getByText('First blood')).toBeInTheDocument();
  });
});
