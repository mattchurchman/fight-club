import { formatAmerican, impliedProbability } from '@shared/index.ts';
import type { BoutResult, BoutStatus, EventStatus, ResultMethod, Winner } from '@shared/index.ts';

export function formatOdds(odds: number | null): string {
  return odds === null ? '—' : formatAmerican(odds);
}

/** null when odds aren't set yet; a rounded implied-probability percentage otherwise. */
export function formatImpliedPct(odds: number | null): string | null {
  if (odds === null) return null;
  return `${Math.round(impliedProbability(odds) * 100)}%`;
}

const METHOD_LABEL: Record<ResultMethod, string> = {
  KO: 'KO/TKO',
  SUB: 'Submission',
  DEC: 'Decision',
  DQ: 'DQ',
  OTHER: 'Other',
};

/** e.g. "KO/TKO · R2 · 1:34". Round/time are omitted when the result doesn't carry them. */
export function formatResultSummary(result: Pick<BoutResult, 'method' | 'round' | 'time'>): string {
  const parts = [METHOD_LABEL[result.method]];
  if (result.round != null) parts.push(`R${result.round}`);
  if (result.time) parts.push(result.time);
  return parts.join(' · ');
}

/** Label for a non-decisive outcome; null for 'A'/'B' since those highlight a fighter half instead. */
export function drawOrNoContestLabel(winner: Winner): string | null {
  if (winner === 'draw') return 'Draw';
  if (winner === 'nc') return 'No Contest';
  return null;
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  scheduled: 'Scheduled',
  open: 'Open',
  locked: 'Locked',
  live: 'Live',
  final: 'Final',
  cancelled: 'Cancelled',
};

export const BOUT_STATUS_LABEL: Record<BoutStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  final: 'Final',
  cancelled: 'Cancelled',
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Formats in the viewer's local timezone (Intl.DateTimeFormat defaults to the runtime's zone). */
export function formatEventDateTime(ms: number): string {
  return dateTimeFormatter.format(new Date(ms));
}
