import type { DraftState } from './draftReducer.ts';

const KEY_PREFIX = 'fight-club:pick-draft:';

function draftKey(eventId: string, uid: string): string {
  return `${KEY_PREFIX}${eventId}:${uid}`;
}

function isDraftState(value: unknown): value is DraftState {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as DraftState).picks === 'object' &&
    'lockBoutId' in value &&
    'firstBlood' in value
  );
}

/** sessionStorage can throw (private browsing, quota) — a lost draft is not worth a crash. */
export function loadDraft(eventId: string, uid: string): DraftState | null {
  try {
    const raw = sessionStorage.getItem(draftKey(eventId, uid));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraftState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(eventId: string, uid: string, draft: DraftState): void {
  try {
    sessionStorage.setItem(draftKey(eventId, uid), JSON.stringify(draft));
  } catch {
    // storage unavailable or full — the draft just won't survive a reload
  }
}

export function clearDraft(eventId: string, uid: string): void {
  try {
    sessionStorage.removeItem(draftKey(eventId, uid));
  } catch {
    // ignore
  }
}
