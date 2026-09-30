// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { clampStep, Stepper } from './Stepper';

describe('clampStep', () => {
  it('clamps to the minimum', () => {
    expect(clampStep(0, -25, 0, 1000)).toBe(0);
  });

  it('clamps to the maximum', () => {
    expect(clampStep(990, 25, 0, 1000)).toBe(1000);
  });

  it('steps within bounds', () => {
    expect(clampStep(100, 25, 0, 1000)).toBe(125);
    expect(clampStep(100, -25, 0, 1000)).toBe(75);
  });
});

describe('Stepper', () => {
  it('disables the decrease button at the minimum', () => {
    render(<Stepper value={0} min={0} max={1000} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
  });

  it('disables the increase button at the maximum', () => {
    render(<Stepper value={1000} min={0} max={1000} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
  });

  it('calls onChange with the clamped value on increase', () => {
    const onChange = vi.fn();
    render(<Stepper value={0} min={0} max={100} step={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(onChange).toHaveBeenCalledWith(25);
  });
});
