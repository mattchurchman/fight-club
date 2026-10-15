// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StakePicker, stepStake } from './StakePicker.tsx';

describe('stepStake', () => {
  it('starts at min when incrementing from undefined', () => {
    expect(stepStake(undefined, 25, 50, 400)).toBe(50);
  });

  it('starts at min when decrementing from undefined', () => {
    expect(stepStake(undefined, -25, 50, 400)).toBe(50);
  });

  it('clamps to max', () => {
    expect(stepStake(390, 25, 50, 400)).toBe(400);
  });

  it('clamps to min', () => {
    expect(stepStake(60, -25, 50, 400)).toBe(50);
  });

  it('steps normally within range', () => {
    expect(stepStake(100, 25, 50, 400)).toBe(125);
    expect(stepStake(100, -25, 50, 400)).toBe(75);
  });
});

describe('StakePicker', () => {
  it('shows — when the value is undefined', () => {
    render(<StakePicker value={undefined} min={50} max={400} step={25} onChange={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('disables Decrease stake when the value is undefined', () => {
    render(<StakePicker value={undefined} min={50} max={400} step={25} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease stake' })).toBeDisabled();
  });

  it('Increase stake sets min when starting from undefined', () => {
    const onChange = vi.fn();
    render(<StakePicker value={undefined} min={50} max={400} step={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase stake' }));
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('disables Increase stake at the max', () => {
    render(<StakePicker value={400} min={50} max={400} step={25} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Increase stake' })).toBeDisabled();
  });

  it('disables Decrease stake at the min', () => {
    render(<StakePicker value={50} min={50} max={400} step={25} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease stake' })).toBeDisabled();
  });

  it('a preset chip sets the stake directly', () => {
    const onChange = vi.fn();
    render(<StakePicker value={undefined} min={50} max={400} step={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '150' }));
    expect(onChange).toHaveBeenCalledWith(150);
  });

  it('marks the matching preset chip selected', () => {
    render(<StakePicker value={200} min={50} max={400} step={25} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '200' })).toHaveAttribute('aria-pressed', 'true');
  });
});
