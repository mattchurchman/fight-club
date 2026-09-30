import type { Corner, EntryDraft, FirstBloodPick, Method, Pick } from '@shared/index.ts';

/**
 * A pick mid-edit may have only some of `winner`/`method`/`stake` set — the player taps
 * a fighter first, then a method, then a stake. `validateEntry` (shared/validation.ts)
 * already reports a missing field as invalid, which is exactly the per-field error we
 * want to surface, so we don't need a separate "incomplete" state.
 */
export type DraftPick = Partial<Pick>;

export interface DraftState {
  picks: Record<string, DraftPick>;
  lockBoutId: string | null;
  firstBlood: FirstBloodPick | null;
}

export const EMPTY_DRAFT: DraftState = { picks: {}, lockBoutId: null, firstBlood: null };

export type DraftAction =
  | { type: 'hydrate'; draft: DraftState }
  | { type: 'setWinner'; boutId: string; winner: Corner }
  | { type: 'setMethod'; boutId: string; method: Method }
  | { type: 'setStake'; boutId: string; stake: number }
  | { type: 'setLock'; boutId: string }
  | { type: 'setFirstBlood'; boutId: string; fighter: Corner }
  | { type: 'autoBalance'; stakes: Record<string, number> };

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'hydrate':
      return action.draft;
    case 'setWinner':
      return {
        ...state,
        picks: {
          ...state.picks,
          [action.boutId]: { ...state.picks[action.boutId], winner: action.winner },
        },
      };
    case 'setMethod':
      return {
        ...state,
        picks: {
          ...state.picks,
          [action.boutId]: { ...state.picks[action.boutId], method: action.method },
        },
      };
    case 'setStake':
      return {
        ...state,
        picks: {
          ...state.picks,
          [action.boutId]: { ...state.picks[action.boutId], stake: action.stake },
        },
      };
    // "Exactly one; tapping another moves it" (docs/tasks/T14 §2) — there is no un-set once a
    // Lock has been chosen, only relocation, so this is an unconditional assignment.
    case 'setLock':
      return { ...state, lockBoutId: action.boutId };
    case 'setFirstBlood':
      return { ...state, firstBlood: { boutId: action.boutId, fighter: action.fighter } };
    case 'autoBalance': {
      const picks = { ...state.picks };
      for (const [boutId, stake] of Object.entries(action.stakes)) {
        picks[boutId] = { ...picks[boutId], stake };
      }
      return { ...state, picks };
    }
    default:
      return state;
  }
}

/**
 * `validateEntry` requires `Record<string, Pick>`; a draft mid-edit is `Record<string, DraftPick>`.
 * The cast is safe because a missing field just reads as `undefined`, which every validator
 * check already treats as invalid (see the doc comment on `DraftPick`).
 */
export function toEntryDraft(draft: DraftState): EntryDraft {
  return draft as unknown as EntryDraft;
}
