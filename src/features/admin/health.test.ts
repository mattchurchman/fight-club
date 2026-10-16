import { describe, expect, it } from 'vitest';
import { eventIssues, jobState, type HealthEvent } from './health.ts';

const H = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 16, 4);

describe('jobState', () => {
  it('flags never-run, failed and late jobs, and passes a fresh one', () => {
    expect(jobState('odds', { lastRunAt: null, ok: null }, NOW)).toBe('never');
    expect(jobState('odds', { lastRunAt: NOW - H, ok: false }, NOW)).toBe('error');
    expect(jobState('odds', { lastRunAt: NOW - 31 * H, ok: true }, NOW)).toBe('late');
    expect(jobState('lifecycle', { lastRunAt: NOW - 9 * H, ok: true }, NOW)).toBe('late');
    expect(jobState('odds', { lastRunAt: NOW - 2 * H, ok: true }, NOW)).toBe('ok');
  });
});

describe('eventIssues', () => {
  const ev = (over: Partial<HealthEvent>): HealthEvent => ({
    id: 'evt_1',
    name: 'UFC 333: A vs. B',
    enabled: true,
    status: 'open',
    lockAtMs: NOW + 2 * 24 * H,
    ...over,
  });
  const priced = { status: 'scheduled', odds: { a: -150, b: 130 } };
  const unpriced = { status: 'scheduled', odds: { a: null, b: null } };

  it('errors on an enabled event stuck on scheduled', () => {
    const [issue] = eventIssues([ev({ status: 'scheduled' })], {}, NOW);
    expect(issue?.level).toBe('error');
    expect(issue?.text).toContain('UFC 333');
  });

  it('warns on missing odds inside the window, errors within 24h of lock', () => {
    expect(eventIssues([ev({})], { evt_1: [priced, unpriced] }, NOW)[0]).toMatchObject({
      level: 'warn',
    });
    expect(
      eventIssues([ev({ lockAtMs: NOW + 5 * H })], { evt_1: [unpriced] }, NOW)[0],
    ).toMatchObject({ level: 'error' });
  });

  it('stays quiet when everything is fine, out of the window, disabled, cancelled or past lock', () => {
    expect(eventIssues([ev({})], { evt_1: [priced] }, NOW)).toEqual([]);
    expect(eventIssues([ev({ lockAtMs: NOW + 20 * 24 * H })], { evt_1: [unpriced] }, NOW)).toEqual(
      [],
    );
    expect(eventIssues([ev({ enabled: false, status: 'scheduled' })], {}, NOW)).toEqual([]);
    expect(eventIssues([ev({})], { evt_1: [{ ...unpriced, status: 'cancelled' }] }, NOW)).toEqual(
      [],
    );
    expect(eventIssues([ev({ lockAtMs: NOW - H, status: 'scheduled' })], {}, NOW)).toEqual([]);
  });
});
