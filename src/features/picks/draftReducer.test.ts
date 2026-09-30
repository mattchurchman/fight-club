import { describe, expect, it } from 'vitest';
import { draftReducer, EMPTY_DRAFT } from './draftReducer.ts';
import type { DraftState } from './draftReducer.ts';

describe('draftReducer', () => {
  it('sets a winner without touching other fields on the same pick', () => {
    const state = draftReducer(
      { ...EMPTY_DRAFT, picks: { bout_1: { method: 'KO', stake: 100 } } },
      { type: 'setWinner', boutId: 'bout_1', winner: 'A' },
    );
    expect(state.picks.bout_1).toEqual({ method: 'KO', stake: 100, winner: 'A' });
  });

  it('sets a method independently', () => {
    const state = draftReducer(EMPTY_DRAFT, { type: 'setMethod', boutId: 'bout_1', method: 'SUB' });
    expect(state.picks.bout_1).toEqual({ method: 'SUB' });
  });

  it('sets a stake independently', () => {
    const state = draftReducer(EMPTY_DRAFT, { type: 'setStake', boutId: 'bout_1', stake: 200 });
    expect(state.picks.bout_1).toEqual({ stake: 200 });
  });

  it('leaves other bouts alone', () => {
    const start: DraftState = { ...EMPTY_DRAFT, picks: { bout_1: { winner: 'A' } } };
    const state = draftReducer(start, { type: 'setStake', boutId: 'bout_2', stake: 100 });
    expect(state.picks.bout_1).toEqual({ winner: 'A' });
    expect(state.picks.bout_2).toEqual({ stake: 100 });
  });

  describe('lock toggle exclusivity', () => {
    it('sets the lock bout on first tap', () => {
      const state = draftReducer(EMPTY_DRAFT, { type: 'setLock', boutId: 'bout_1' });
      expect(state.lockBoutId).toBe('bout_1');
    });

    it('tapping a different bout moves the lock instead of adding a second one', () => {
      const first = draftReducer(EMPTY_DRAFT, { type: 'setLock', boutId: 'bout_1' });
      const second = draftReducer(first, { type: 'setLock', boutId: 'bout_2' });
      expect(second.lockBoutId).toBe('bout_2');
    });

    it('tapping the current lock again is a no-op, not an un-set', () => {
      const first = draftReducer(EMPTY_DRAFT, { type: 'setLock', boutId: 'bout_1' });
      const second = draftReducer(first, { type: 'setLock', boutId: 'bout_1' });
      expect(second.lockBoutId).toBe('bout_1');
    });
  });

  it('sets first blood as a bout/fighter pair', () => {
    const state = draftReducer(EMPTY_DRAFT, {
      type: 'setFirstBlood',
      boutId: 'bout_3',
      fighter: 'B',
    });
    expect(state.firstBlood).toEqual({ boutId: 'bout_3', fighter: 'B' });
  });

  it('replaces the whole state on hydrate', () => {
    const draft: DraftState = {
      picks: { bout_1: { winner: 'A', method: 'KO', stake: 100 } },
      lockBoutId: 'bout_1',
      firstBlood: null,
    };
    const state = draftReducer(EMPTY_DRAFT, { type: 'hydrate', draft });
    expect(state).toEqual(draft);
  });

  it('merges auto-balanced stakes into existing picks without clobbering winner/method', () => {
    const start: DraftState = { ...EMPTY_DRAFT, picks: { bout_1: { winner: 'A', method: 'KO' } } };
    const state = draftReducer(start, {
      type: 'autoBalance',
      stakes: { bout_1: 150, bout_2: 250 },
    });
    expect(state.picks.bout_1).toEqual({ winner: 'A', method: 'KO', stake: 150 });
    expect(state.picks.bout_2).toEqual({ stake: 250 });
  });
});
