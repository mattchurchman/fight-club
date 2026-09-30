import { describe, expect, it } from 'vitest';
import type { EventStatus } from '@shared/index.ts';
import { categorizeEvents, selectDefaultEventId } from './hooks.ts';

function ts(ms: number) {
  return { toMillis: () => ms };
}

interface TestEvent {
  id: string;
  status: EventStatus;
  lockAt: ReturnType<typeof ts>;
  startsAt: ReturnType<typeof ts>;
}

function event(overrides: Partial<TestEvent> & { id: string }): TestEvent {
  return { status: 'open', lockAt: ts(0), startsAt: ts(0), ...overrides };
}

describe('categorizeEvents', () => {
  it('puts open/locked/live events in upcoming, soonest lock first', () => {
    const events = [
      event({ id: 'a', status: 'open', lockAt: ts(300) }),
      event({ id: 'b', status: 'locked', lockAt: ts(100) }),
      event({ id: 'c', status: 'live', lockAt: ts(200) }),
    ];

    expect(categorizeEvents(events).upcoming.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts final events in recent, most recently held first', () => {
    const events = [
      event({ id: 'a', status: 'final', startsAt: ts(100) }),
      event({ id: 'b', status: 'final', startsAt: ts(300) }),
      event({ id: 'c', status: 'final', startsAt: ts(200) }),
    ];

    expect(categorizeEvents(events).recent.map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });

  it('excludes scheduled and cancelled events from both lists', () => {
    const events = [
      event({ id: 'a', status: 'scheduled' }),
      event({ id: 'b', status: 'cancelled' }),
    ];

    const { upcoming, recent } = categorizeEvents(events);
    expect(upcoming).toEqual([]);
    expect(recent).toEqual([]);
  });
});

describe('selectDefaultEventId', () => {
  it('picks the soonest upcoming event over any recent one', () => {
    expect(selectDefaultEventId([{ id: 'up' }], [{ id: 'recent' }])).toBe('up');
  });

  it('falls back to the most recent final event when nothing is upcoming', () => {
    expect(selectDefaultEventId([], [{ id: 'recent' }])).toBe('recent');
  });

  it('returns null when there are no events at all', () => {
    expect(selectDefaultEventId([], [])).toBeNull();
  });
});
