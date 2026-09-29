import { describe, expect, it } from 'vitest';
import { DEFAULTS } from './constants';
import { activeBoutIds, computeBudget, mainCardBoutIds, validateEntry } from './validation';
import type { EntryDraft, EventRules, ValidationResult } from './validation';
import type { Bout, Pick } from './types';

// Ts = number proves shared/ needs no firebase Timestamp.
type TestBout = Bout<number>;

function bout(over: Partial<TestBout> = {}): TestBout {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: -110, b: -110, source: 'espn', updatedAt: 0, frozen: true },
    status: 'scheduled',
    result: null,
    ...over,
  };
}

/** A main card of `n` bouts, ids `b1..bn`, ordered 1..n. */
function card(n: number, over: Record<string, Partial<TestBout>> = {}): Record<string, TestBout> {
  const bouts: Record<string, TestBout> = {};
  for (let i = 1; i <= n; i += 1) {
    bouts[`b${i}`] = bout({ order: i, ...over[`b${i}`] });
  }
  return bouts;
}

function pick(over: Partial<Pick> = {}): Pick {
  return { winner: 'A', method: 'DEC', stake: 100, ...over };
}

const EVENT: EventRules = { budget: DEFAULTS.budget, firstBloodEnabled: false };

/** Stakes 400/300/300 over a 3-bout card = the default 1000 budget. */
function validDraft(over: Partial<EntryDraft> = {}): EntryDraft {
  return {
    picks: {
      b1: pick({ stake: 400 }),
      b2: pick({ stake: 300 }),
      b3: pick({ stake: 300 }),
    },
    lockBoutId: 'b1',
    firstBlood: null,
    ...over,
  };
}

const codes = (result: ValidationResult): string[] => result.errors.map((e) => e.code);

describe('computeBudget', () => {
  it('uses the configured budget when it is reachable', () => {
    expect(computeBudget(3)).toBe(1000);
    expect(computeBudget(5)).toBe(1000);
  });

  it('shrinks to activeBouts x maxStake when the budget cannot be spent', () => {
    expect(computeBudget(2)).toBe(800);
    expect(computeBudget(1)).toBe(400);
  });

  it('grows to activeBouts x minStake when the budget is below the floor', () => {
    expect(computeBudget(25)).toBe(1250);
  });

  it('is 0 for an empty card', () => {
    expect(computeBudget(0)).toBe(0);
  });

  it('ignores negative and fractional counts', () => {
    expect(computeBudget(-3)).toBe(0);
    expect(computeBudget(2.9)).toBe(800);
  });

  it('honours a per-event budget override', () => {
    expect(computeBudget(3, { ...DEFAULTS, budget: 600 })).toBe(600);
  });
});

describe('activeBoutIds / mainCardBoutIds', () => {
  it('orders by bout order and drops prelims', () => {
    const bouts = card(3, { b2: { isMainCard: false } });
    expect(activeBoutIds(bouts)).toEqual(['b1', 'b3']);
    expect(mainCardBoutIds(bouts)).toEqual(['b1', 'b3']);
  });

  it('drops cancelled bouts from active but keeps them on the main card', () => {
    const bouts = card(3, { b2: { status: 'cancelled' } });
    expect(activeBoutIds(bouts)).toEqual(['b1', 'b3']);
    expect(mainCardBoutIds(bouts)).toEqual(['b1', 'b2', 'b3']);
  });

  it('is deterministic when two bouts share an order', () => {
    const bouts = { zz: bout({ order: 1 }), aa: bout({ order: 1 }) };
    expect(activeBoutIds(bouts)).toEqual(['aa', 'zz']);
  });
});

describe('validateEntry', () => {
  it('accepts a complete entry', () => {
    expect(validateEntry(validDraft(), card(3), EVENT)).toEqual({ ok: true, errors: [] });
  });

  it('reports a missing pick against its bout', () => {
    const draft = validDraft();
    delete draft.picks.b2;
    const result = validateEntry(draft, card(3), EVENT);
    expect(codes(result)).toContain('MISSING_PICK');
    expect(result.errors[0]?.boutId).toBe('b2');
  });

  it('rejects a stake below the minimum', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 25 }), b2: pick({ stake: 575 }), b3: pick({ stake: 400 }) },
    });
    expect(codes(validateEntry(draft, card(3), EVENT))).toContain('STAKE_RANGE');
  });

  it('rejects a stake above the maximum', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 425 }), b2: pick({ stake: 300 }), b3: pick({ stake: 275 }) },
    });
    expect(codes(validateEntry(draft, card(3), EVENT))).toContain('STAKE_RANGE');
  });

  it('rejects a stake that is not a multiple of 25', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 330 }), b2: pick({ stake: 370 }), b3: pick({ stake: 300 }) },
    });
    expect(codes(validateEntry(draft, card(3), EVENT))).toContain('STAKE_STEP');
  });

  it('rejects a fractional stake', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 300.5 }), b2: pick({ stake: 399.5 }), b3: pick({ stake: 300 }) },
    });
    expect(codes(validateEntry(draft, card(3), EVENT))).toContain('STAKE_STEP');
  });

  it('rejects a non-finite stake without reporting a budget it cannot compute', () => {
    const draft = validDraft({
      picks: {
        b1: pick({ stake: Number.NaN }),
        b2: pick({ stake: 300 }),
        b3: pick({ stake: 300 }),
      },
    });
    expect(codes(validateEntry(draft, card(3), EVENT))).toContain('STAKE_RANGE');
  });

  it('rejects stakes that do not add up to the budget', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 400 }), b2: pick({ stake: 300 }), b3: pick({ stake: 275 }) },
    });
    const result = validateEntry(draft, card(3), EVENT);
    expect(codes(result)).toContain('BUDGET_MISMATCH');
    expect(result.errors.find((e) => e.code === 'BUDGET_MISMATCH')?.message).toContain('1000');
  });

  it('rejects an invalid winner or method', () => {
    const draft = validDraft({
      picks: {
        b1: { winner: 'C', method: 'DEC', stake: 400 } as unknown as Pick,
        b2: { winner: 'A', method: 'DQ', stake: 300 } as unknown as Pick,
        b3: pick({ stake: 300 }),
      },
    });
    const result = validateEntry(draft, card(3), EVENT);
    expect(codes(result)).toContain('WINNER_INVALID');
    expect(codes(result)).toContain('METHOD_INVALID');
  });

  it('requires a lock', () => {
    expect(codes(validateEntry(validDraft({ lockBoutId: null }), card(3), EVENT))).toContain(
      'LOCK_REQUIRED',
    );
    expect(codes(validateEntry(validDraft({ lockBoutId: '' }), card(3), EVENT))).toContain(
      'LOCK_REQUIRED',
    );
  });

  it('rejects a lock on a bout that is not picked', () => {
    expect(codes(validateEntry(validDraft({ lockBoutId: 'b9' }), card(3), EVENT))).toContain(
      'LOCK_INVALID',
    );
  });

  it('rejects a lock on a cancelled bout', () => {
    const bouts = card(3, { b1: { status: 'cancelled' } });
    // b2 + b3 = 800, the adjusted budget for two active bouts.
    const draft = validDraft({
      picks: { b1: pick({ stake: 400 }), b2: pick({ stake: 400 }), b3: pick({ stake: 400 }) },
      lockBoutId: 'b1',
    });
    expect(codes(validateEntry(draft, bouts, EVENT))).toContain('LOCK_INVALID');
  });

  it('adjusts the budget when a bout is cancelled and keeps the orphaned pick', () => {
    const bouts = card(3, { b3: { status: 'cancelled' } });
    const draft = validDraft({
      picks: { b1: pick({ stake: 400 }), b2: pick({ stake: 400 }), b3: pick({ stake: 300 }) },
      lockBoutId: 'b1',
    });
    expect(validateEntry(draft, bouts, EVENT)).toEqual({ ok: true, errors: [] });
  });

  it('flags picks on bouts that are not on this main card', () => {
    const bouts = card(3, { b2: { isMainCard: false } });
    const draft = validDraft({
      picks: {
        b1: pick({ stake: 400 }),
        b2: pick({ stake: 300 }),
        b3: pick({ stake: 400 }),
        b9: pick({ stake: 50 }),
      },
      lockBoutId: 'b1',
    });
    const result = validateEntry(draft, bouts, EVENT);
    expect(result.errors.filter((e) => e.code === 'UNKNOWN_BOUT').map((e) => e.boutId)).toEqual([
      'b2',
      'b9',
    ]);
  });

  it('reports an empty card once and stops', () => {
    const bouts = card(2, { b1: { status: 'cancelled' }, b2: { status: 'cancelled' } });
    expect(validateEntry(validDraft(), bouts, EVENT).errors).toEqual([
      { code: 'NO_ACTIVE_BOUTS', message: expect.any(String) },
    ]);
  });

  it('requires first blood only when the event enables it', () => {
    const enabled: EventRules = { ...EVENT, firstBloodEnabled: true };
    expect(codes(validateEntry(validDraft(), card(3), enabled))).toContain('FIRST_BLOOD_REQUIRED');
    expect(
      validateEntry(validDraft({ firstBlood: { boutId: 'b2', fighter: 'B' } }), card(3), enabled)
        .ok,
    ).toBe(true);
  });

  it('ignores a first-blood pick when the event has it disabled', () => {
    const draft = validDraft({ firstBlood: { boutId: 'nope', fighter: 'A' } });
    expect(validateEntry(draft, card(3), EVENT).ok).toBe(true);
  });

  it('rejects first blood on a bout that is off the card, or on a fighter that is not A or B', () => {
    const enabled: EventRules = { ...EVENT, firstBloodEnabled: true };
    const offCard = validDraft({ firstBlood: { boutId: 'b9', fighter: 'A' } });
    expect(codes(validateEntry(offCard, card(3), enabled))).toContain('FIRST_BLOOD_INVALID');
    const badFighter = validDraft({
      firstBlood: { boutId: 'b1', fighter: 'C' } as unknown as EntryDraft['firstBlood'],
    });
    expect(codes(validateEntry(badFighter, card(3), enabled))).toContain('FIRST_BLOOD_INVALID');
  });

  it('accepts a single-bout card at the adjusted budget of 400', () => {
    const draft: EntryDraft = {
      picks: { b1: pick({ stake: 400 }) },
      lockBoutId: 'b1',
      firstBlood: null,
    };
    expect(validateEntry(draft, card(1), EVENT).ok).toBe(true);
  });

  it('honours a per-event budget override', () => {
    const draft = validDraft({
      picks: { b1: pick({ stake: 200 }), b2: pick({ stake: 200 }), b3: pick({ stake: 200 }) },
    });
    expect(validateEntry(draft, card(3), { ...EVENT, budget: 600 }).ok).toBe(true);
  });

  it('every error carries a message the UI can show', () => {
    const draft = validDraft({ picks: { b1: pick({ stake: 30 }) }, lockBoutId: null });
    for (const error of validateEntry(draft, card(3), { ...EVENT, firstBloodEnabled: true })
      .errors) {
      expect(error.message.length).toBeGreaterThan(0);
    }
  });
});
