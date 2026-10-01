import { describe, expect, it } from 'vitest';
import {
  planFinalizeSummaries,
  planLockReminderEvents,
  planTokenRequestNotifications,
  type FinalizeEntryInput,
  type LockReminderEvent,
  type TokenRequestInput,
} from './notify.ts';

const NOW = Date.parse('2026-09-29T00:00:00.000Z');
const HOUR = 60 * 60 * 1000;

function event(overrides: Partial<LockReminderEvent> = {}): LockReminderEvent {
  return {
    id: 'evt_1',
    name: 'UFC 320',
    status: 'open',
    lockAt: NOW + HOUR,
    notifiedLockReminder: false,
    ...overrides,
  };
}

describe('planLockReminderEvents', () => {
  it('fires for an event locking in 1 hour', () => {
    expect(planLockReminderEvents([event()], NOW)).toEqual([event()]);
  });

  it('skips an event locking in under 45 minutes', () => {
    expect(planLockReminderEvents([event({ lockAt: NOW + 30 * 60 * 1000 })], NOW)).toEqual([]);
  });

  it('skips an event locking in over 75 minutes', () => {
    expect(planLockReminderEvents([event({ lockAt: NOW + 90 * 60 * 1000 })], NOW)).toEqual([]);
  });

  it('skips an event already reminded, even inside the window', () => {
    expect(planLockReminderEvents([event({ notifiedLockReminder: true })], NOW)).toEqual([]);
  });

  it('skips an event that is not open', () => {
    expect(planLockReminderEvents([event({ status: 'locked' })], NOW)).toEqual([]);
  });
});

describe('planFinalizeSummaries', () => {
  it('builds one payload per entry with rank and payout filled in', () => {
    const entries: FinalizeEntryInput[] = [
      { uid: 'u1', rank: 1, payout: 350 },
      { uid: 'u2', rank: 2, payout: -100 },
    ];
    const plans = planFinalizeSummaries('evt_1', 'UFC 320', entries);
    expect(plans).toEqual([
      {
        uid: 'u1',
        payload: {
          title: 'Results are in',
          body: 'You finished 1st in UFC 320 (+350 tokens).',
          url: '/events/evt_1',
        },
      },
      {
        uid: 'u2',
        payload: {
          title: 'Results are in',
          body: 'You finished 2nd in UFC 320 (-100 tokens).',
          url: '/events/evt_1',
        },
      },
    ]);
  });

  it('uses English ordinal suffixes, including the 11-13 exception', () => {
    const entries: FinalizeEntryInput[] = [
      { uid: 'u3', rank: 3, payout: 0 },
      { uid: 'u11', rank: 11, payout: 0 },
      { uid: 'u21', rank: 21, payout: 0 },
    ];
    const bodies = planFinalizeSummaries('evt_1', 'UFC 320', entries).map((p) => p.payload.body);
    expect(bodies[0]).toContain('3rd');
    expect(bodies[1]).toContain('11th');
    expect(bodies[2]).toContain('21st');
  });
});

describe('planTokenRequestNotifications', () => {
  function request(overrides: Partial<TokenRequestInput> = {}): TokenRequestInput {
    return { id: 'req_1', uid: 'u1', amount: 200, status: 'approved', notifiedAt: null, ...overrides };
  }

  it('notifies an approved request not yet told', () => {
    expect(planTokenRequestNotifications([request()])).toEqual([
      {
        id: 'req_1',
        uid: 'u1',
        payload: {
          title: 'Token request approved',
          body: 'Your request for 200 tokens was approved.',
          url: '/wallet',
        },
      },
    ]);
  });

  it('notifies a denied request with denial copy', () => {
    const [plan] = planTokenRequestNotifications([request({ status: 'denied' })]);
    expect(plan!.payload.title).toBe('Token request denied');
    expect(plan!.payload.body).toBe('Your request for 200 tokens was denied.');
  });

  it('skips a pending request', () => {
    expect(planTokenRequestNotifications([request({ status: 'pending' })])).toEqual([]);
  });

  it('skips a resolved request already notified — no duplicates on a re-run', () => {
    expect(planTokenRequestNotifications([request({ notifiedAt: NOW })])).toEqual([]);
  });
});
