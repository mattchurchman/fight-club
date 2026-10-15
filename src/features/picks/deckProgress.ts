import type { DraftPick, DraftState } from './draftReducer.ts';

/** A fight's slide is done once winner + method + stake are all set (docs/DESIGN.md "Pick deck"). */
export function isPickComplete(pick: DraftPick | undefined): boolean {
  return pick?.winner !== undefined && pick?.method !== undefined && typeof pick.stake === 'number';
}

/** How many of the active fights have a complete pick, for the deck's "Fight n / N" / progress strip. */
export function completedCount(draft: DraftState, activeIds: readonly string[]): number {
  return activeIds.filter((boutId) => isPickComplete(draft.picks[boutId])).length;
}
