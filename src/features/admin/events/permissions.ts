// docs/tasks/T18 step 1/2: what an admin may edit, by event status. Pure so it's trivial to test
// and so the UI can disable controls without re-deriving the rules inline.
import type { EventStatus } from '@shared/index.ts';

/** Buy-in and the first-blood toggle: docs/tasks/T18 step 1 — only while entries are still open. */
export function canEditEventTerms(status: EventStatus): boolean {
  return status === 'open';
}

/** Reordering or removing a bout from the main card: only before it locks (docs/tasks/T18 step 2). */
export function canEditCard(status: EventStatus): boolean {
  return status === 'scheduled' || status === 'open';
}

/** Odds freeze at lock (docs/GAME_RULES.md §4) and score on that frozen snapshot after — editing
 * them later would silently disagree with what already scored. */
export function canOverrideOdds(status: EventStatus): boolean {
  return status === 'scheduled' || status === 'open';
}

/** A bout only has a result to enter once the card is in play (docs/GAME_RULES.md §4, §4.6). */
export function canEnterResult(status: EventStatus): boolean {
  return status === 'locked' || status === 'live';
}

/** Mirrors `planScores`' own guard (shared/lifecycle/scores.ts) so the button reflects reality. */
export function canRescore(status: EventStatus): boolean {
  return status === 'locked' || status === 'live';
}

/** Mirrors `planFinalize`'s guard (shared/lifecycle/finalize.ts). */
export function canFinalize(status: EventStatus): boolean {
  return status === 'locked' || status === 'live';
}

/** Anything not already settled can be called off. */
export function canCancel(status: EventStatus): boolean {
  return status !== 'final' && status !== 'cancelled';
}

/**
 * The status an event should land on when an admin flips `enabled`, or `null` to leave it alone.
 *
 * `jobs/ingest-events.ts` sets `status` once, at creation: `enabled ? 'open' : 'scheduled'`, and
 * never revisits it. So an event ingested while disabled stays `scheduled` forever unless enabling
 * it promotes it here — and a `scheduled` event is invisible twice over: `categorizeEvents`
 * (src/features/events/hooks.ts) only lists open/locked/live/final to players, and the odds job
 * only prices events matching `status == 'open'` (jobs/ingest-odds.ts#loadCandidateEvents).
 *
 * Only the `scheduled → open` promotion is automatic. Disabling never rewinds a status, and an
 * event already past `open` (locked/live/final/cancelled) keeps the status its lifecycle gave it.
 */
export function statusOnEnabledChange(status: EventStatus, enabled: boolean): EventStatus | null {
  return enabled && status === 'scheduled' ? 'open' : null;
}
