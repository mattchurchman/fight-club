// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Countdown, formatCountdown, formatUrgentCountdown } from './Countdown';

describe('formatCountdown', () => {
  it('returns Locked at or below zero', () => {
    expect(formatCountdown(0)).toBe('Locked');
    expect(formatCountdown(-1000)).toBe('Locked');
  });

  it('formats seconds only under a minute', () => {
    expect(formatCountdown(45 * 1000)).toBe('45s');
  });

  it('formats minutes and seconds under an hour', () => {
    expect(formatCountdown(5 * 60 * 1000 + 12 * 1000)).toBe('5m 12s');
  });

  it('formats hours and minutes under a day', () => {
    expect(formatCountdown(2 * 60 * 60 * 1000 + 14 * 60 * 1000)).toBe('2h 14m');
  });

  it('formats days and hours at or over a day', () => {
    expect(formatCountdown(3 * 86400 * 1000 + 4 * 60 * 60 * 1000)).toBe('3d 4h');
  });
});

describe('formatUrgentCountdown', () => {
  it('returns Locked at or below zero', () => {
    expect(formatUrgentCountdown(0)).toBe('Locked');
  });

  it('formats mm:ss under an hour', () => {
    expect(formatUrgentCountdown(5 * 60 * 1000 + 12 * 1000)).toBe('05:12');
  });

  it('formats h:mm:ss at or over an hour', () => {
    expect(formatUrgentCountdown(60 * 60 * 1000 + 2 * 1000)).toBe('1:00:02');
  });
});

describe('Countdown urgency threshold', () => {
  it('is not urgent just above the default 1h threshold', () => {
    render(<Countdown target={Date.now() + 60 * 60 * 1000 + 5000} />);
    expect(screen.getByText(/Locks in 1h 0m/)).not.toHaveClass('text-red-text');
  });

  it('is urgent just below the default 1h threshold', () => {
    render(<Countdown target={Date.now() + 60 * 60 * 1000 - 5000} />);
    expect(screen.getByText(/^Locks in \d{2}:\d{2}$/)).toHaveClass('text-red-text');
  });
});
