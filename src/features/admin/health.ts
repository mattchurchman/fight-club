// Admin "is it actually working?" checks. A job reporting `ok` only means it didn't crash; these look
// at the outcome instead: is every enabled event visible to players, do upcoming fights have odds,
// and has each job run as recently as its schedule promises.

export type HealthLevel = 'error' | 'warn';

export interface HealthIssue {
  level: HealthLevel;
  text: string;
  /** Admin page that fixes it, when there is one. */
  to?: string;
}

export type JobState = 'never' | 'error' | 'late' | 'ok';

/** Longest normal gap between runs, with slack for GitHub delivering crons hours late. */
export const STALE_AFTER_HOURS: Record<string, number> = { ingest: 30, odds: 30, lifecycle: 8 };

/** The odds job only prices events locking within this many days (jobs/ingest-odds.ts LOOKAHEAD_DAYS). */
export const ODDS_LOOKAHEAD_DAYS = 10;

const HOUR = 60 * 60 * 1000;

export function jobState(
  id: string,
  run: { lastRunAt: number | null; ok: boolean | null },
  nowMs: number,
): JobState {
  if (run.lastRunAt === null || run.ok === null) return 'never';
  if (!run.ok) return 'error';
  const limit = STALE_AFTER_HOURS[id];
  if (limit !== undefined && nowMs - run.lastRunAt > limit * HOUR) return 'late';
  return 'ok';
}

export interface HealthEvent {
  id: string;
  name: string;
  enabled: boolean;
  status: string;
  lockAtMs: number;
}

export interface HealthBout {
  status: string;
  odds: { a: number | null; b: number | null };
}

export function eventIssues(
  events: readonly HealthEvent[],
  boutsByEvent: Readonly<Record<string, readonly HealthBout[]>>,
  nowMs: number,
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  for (const event of events) {
    if (!event.enabled || event.lockAtMs <= nowMs) continue;
    const to = `/admin/events/${event.id}`;
    const label = event.name.split(':')[0]!.trim();

    if (event.status === 'scheduled') {
      issues.push({
        level: 'error',
        text: `${label} is enabled but still "scheduled": players can't see it and it won't get odds. Toggle Disable → Enable (the daily import also fixes it).`,
        to,
      });
      continue;
    }
    if (event.status !== 'open') continue;
    if (event.lockAtMs - nowMs > ODDS_LOOKAHEAD_DAYS * 24 * HOUR) continue;

    const bouts = boutsByEvent[event.id];
    if (!bouts) continue;
    const active = bouts.filter((b) => b.status !== 'cancelled');
    const missing = active.filter((b) => b.odds.a === null || b.odds.b === null).length;
    if (missing === 0) continue;
    const soon = event.lockAtMs - nowMs < 24 * HOUR;
    issues.push({
      level: soon ? 'error' : 'warn',
      text: `${label}: ${missing} of ${active.length} fights have no odds yet${soon ? ', and picks lock within 24h' : ''}. Run the odds job by hand if ESPN has lines.`,
      to,
    });
  }
  return issues;
}
