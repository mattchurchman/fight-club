import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT } from './draftReducer.ts';
import type { DraftState } from './draftReducer.ts';
import { completedCount, isPickComplete } from './deckProgress.ts';

describe('isPickComplete', () => {
  it('is false when the pick is undefined', () => {
    expect(isPickComplete(undefined)).toBe(false);
  });

  it('is false when any field is missing', () => {
    expect(isPickComplete({ winner: 'A' })).toBe(false);
    expect(isPickComplete({ winner: 'A', method: 'KO' })).toBe(false);
    expect(isPickComplete({ winner: 'A', stake: 100 })).toBe(false);
  });

  it('is true once winner, method and stake are all set', () => {
    expect(isPickComplete({ winner: 'A', method: 'KO', stake: 100 })).toBe(true);
  });

  it('treats a zero stake as set', () => {
    expect(isPickComplete({ winner: 'A', method: 'KO', stake: 0 })).toBe(true);
  });
});

describe('completedCount', () => {
  it('counts only active fights with a complete pick', () => {
    const draft: DraftState = {
      ...EMPTY_DRAFT,
      picks: {
        b1: { winner: 'A', method: 'KO', stake: 100 },
        b2: { winner: 'B' },
        b3: { winner: 'A', method: 'DEC', stake: 200 },
      },
    };
    expect(completedCount(draft, ['b1', 'b2', 'b3'])).toBe(2);
  });

  it('ignores picks for fights outside the active list', () => {
    const draft: DraftState = {
      ...EMPTY_DRAFT,
      picks: { b1: { winner: 'A', method: 'KO', stake: 100 } },
    };
    expect(completedCount(draft, ['b2'])).toBe(0);
  });

  it('is zero for an empty draft', () => {
    expect(completedCount(EMPTY_DRAFT, ['b1', 'b2'])).toBe(0);
  });
});
