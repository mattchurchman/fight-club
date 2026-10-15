export interface SubmitLabelState {
  broke: boolean;
  /** Active fights with no complete winner+method+stake pick yet. */
  missingPicks: number;
  /** `allocated - budget`; 0 once the entry spends its budget exactly. */
  budgetDiff: number;
  hasLock: boolean;
  /** True once this player already has a submitted entry for this event. */
  hasEntry: boolean;
}

export interface SubmitLabelInfo {
  label: string;
  ready: boolean;
}

/**
 * Pure classifier for the review slide's Submit button (docs/tasks/T33 §4): the label always
 * names the single most pressing unmet condition, checked in this fixed order.
 */
export function submitLabel(state: SubmitLabelState): SubmitLabelInfo {
  if (state.broke) {
    return { label: "You're broke. Beg the admin.", ready: false };
  }
  if (state.missingPicks > 0) {
    return { label: `Pick ${state.missingPicks} more fights`, ready: false };
  }
  if (state.budgetDiff !== 0) {
    const label =
      state.budgetDiff > 0
        ? `Adjust stakes: ${state.budgetDiff} over`
        : `Adjust stakes: ${-state.budgetDiff} left`;
    return { label, ready: false };
  }
  if (!state.hasLock) {
    return { label: 'Choose your lock', ready: false };
  }
  return { label: state.hasEntry ? 'Update picks' : 'Submit picks', ready: true };
}
