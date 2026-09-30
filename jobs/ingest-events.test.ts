import { describe, expect, it } from 'vitest';
import { planEventWrites, type ExistingEvent, type PlanConfig } from './ingest-events.ts';
import type { ParsedBout, ParsedEvent, ParsedFighter } from './lib/espn.ts';

const CONFIG: PlanConfig = { autoEnableNumbered: true, buyIn: 100, budget: 1000 };
const NOW = '2026-09-29T00:00:00.000Z';
const identity = (iso: string): string => iso;

function fighter(id: string, name: string): ParsedFighter {
  return { espnId: id, fighterId: `ftr_${id}`, name, record: '10-1-0', country: 'USA', headshotUrl: `hs/${id}` };
}

function bout(espnId: string, order: number): ParsedBout {
  return {
    espnId,
    boutId: `bout_${espnId}`,
    order,
    isMainEvent: order === 1,
    weightClass: 'Welterweight',
    rounds: order === 1 ? 5 : 3,
    startsAt: '2026-10-04T00:00:00.000Z',
    a: fighter(`${espnId}a`, `Fighter ${espnId}A`),
    b: fighter(`${espnId}b`, `Fighter ${espnId}B`),
  };
}

function parsedEvent(bouts: ParsedBout[], overrides: Partial<ParsedEvent> = {}): ParsedEvent {
  return {
    espnId: '600061182',
    name: 'UFC 332: Silva vs. Wang',
    subtitle: 'Silva vs. Wang',
    number: 332,
    kind: 'numbered',
    startsAt: '2026-10-03T20:00:00.000Z',
    lockAt: '2026-10-04T00:00:00.000Z',
    venue: 'Delta Center, Salt Lake City, UT',
    bouts,
    ...overrides,
  };
}

describe('planEventWrites', () => {
  it('initializes a brand-new event with config defaults and full bout/fighter upserts', () => {
    const parsed = parsedEvent([bout('1', 1), bout('2', 2)]);
    const plan = planEventWrites(null, parsed, CONFIG, NOW, identity);

    expect(plan.event.id).toBe('evt_600061182');
    expect(plan.event.data).toMatchObject({
      enabled: true,
      status: 'open',
      buyIn: 100,
      budget: 1000,
      firstBloodEnabled: false,
      paidEntrants: 0,
      pot: 0,
      finalizedAt: null,
      mainCardBoutIds: ['bout_1', 'bout_2'],
    });
    expect(plan.bouts).toEqual([
      { action: 'upsert', id: 'bout_1', data: expect.objectContaining({ status: 'scheduled', result: null }) },
      { action: 'upsert', id: 'bout_2', data: expect.objectContaining({ status: 'scheduled', result: null }) },
    ]);
    expect(plan.fighters).toHaveLength(4);
  });

  it('does not create an enabled/open event when the event is not numbered', () => {
    const parsed = parsedEvent([bout('1', 1)], { kind: 'special', number: null });
    const plan = planEventWrites(null, parsed, CONFIG, NOW, identity);
    expect(plan.event.data.enabled).toBe(false);
    expect(plan.event.data.status).toBe('scheduled');
  });

  it('never overwrites an admin-edited event\'s status/buyIn/enabled/firstBloodEnabled, and preserves existing bout state', () => {
    const existing: ExistingEvent = {
      status: 'open',
      buyIn: 250, // admin raised the buy-in
      budget: 1000,
      enabled: false, // admin disabled it
      firstBloodEnabled: true, // admin turned this on
      boutIds: ['bout_1'],
    };
    const parsed = parsedEvent([bout('1', 1), bout('2', 2)]);
    const plan = planEventWrites(existing, parsed, CONFIG, NOW, identity);

    expect(plan.event.data).not.toHaveProperty('status');
    expect(plan.event.data).not.toHaveProperty('buyIn');
    expect(plan.event.data).not.toHaveProperty('enabled');
    expect(plan.event.data).not.toHaveProperty('firstBloodEnabled');
    expect(plan.event.data).not.toHaveProperty('paidEntrants');
    // still refreshes descriptive/card fields
    expect(plan.event.data.mainCardBoutIds).toEqual(['bout_1', 'bout_2']);

    // bout_1 already existed: no odds/status/result reset. bout_2 is new: gets defaults.
    const bout1 = plan.bouts.find((b) => b.id === 'bout_1');
    const bout2 = plan.bouts.find((b) => b.id === 'bout_2');
    expect(bout1 && 'data' in bout1 ? bout1.data : undefined).not.toHaveProperty('status');
    expect(bout1 && 'data' in bout1 ? bout1.data : undefined).not.toHaveProperty('odds');
    expect(bout2 && 'data' in bout2 ? bout2.data.status : undefined).toBe('scheduled');
  });

  it('cancels a bout that disappeared from the source before lock', () => {
    const existing: ExistingEvent = {
      status: 'open',
      buyIn: 100,
      budget: 1000,
      enabled: true,
      firstBloodEnabled: false,
      boutIds: ['bout_1', 'bout_2'],
    };
    const parsed = parsedEvent([bout('1', 1)]); // bout_2 pulled from the card
    const plan = planEventWrites(existing, parsed, CONFIG, NOW, identity);

    expect(plan.bouts).toContainEqual({ action: 'cancel', id: 'bout_2' });
    expect(plan.bouts.find((b) => b.id === 'bout_1')).toMatchObject({ action: 'upsert' });
  });

  it('touches nothing but cancellations once an event is locked or later', () => {
    const existing: ExistingEvent = {
      status: 'locked',
      buyIn: 100,
      budget: 1000,
      enabled: true,
      firstBloodEnabled: false,
      boutIds: ['bout_1', 'bout_2'],
    };
    const parsed = parsedEvent([bout('1', 1)]); // bout_2 disappeared, bout_1's details "changed" upstream
    const plan = planEventWrites(existing, parsed, CONFIG, NOW, identity);

    expect(plan.event.data).not.toHaveProperty('startsAt');
    expect(plan.event.data).not.toHaveProperty('lockAt');
    expect(plan.event.data).not.toHaveProperty('venue');
    expect(plan.event.data).not.toHaveProperty('mainCardBoutIds');
    expect(plan.bouts).toEqual([{ action: 'cancel', id: 'bout_2' }]);
    expect(plan.fighters).toEqual([]);
  });
});
