import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase.ts';
import { eventIssues, jobState, ODDS_LOOKAHEAD_DAYS, type HealthBout, type JobState } from './health.ts';
import { Card } from '../../components/ui/Card.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useAllTokenRequests, useAllUsers, useAllowlist, useJobRuns } from './hooks.ts';
import { useAllEvents } from './events/hooks.ts';

interface StatCardProps {
  to: string;
  label: string;
  value: number | null;
}

function StatCard({ to, label, value }: StatCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-muted">{label}</span>
        {value === null ? <Skeleton className="h-8 w-12" /> : <span className="font-display text-3xl text-text">{value}</span>}
      </Card>
    </Link>
  );
}

const JOB_BADGE: Record<JobState, { label: string; className: string }> = {
  ok: { label: 'ok', className: 'border-green-500 text-green-500' },
  late: { label: 'late', className: 'border-text text-text' },
  error: { label: 'error', className: 'border-red text-red-text' },
  never: { label: 'never run', className: 'border-line text-muted' },
};

/** One-shot read of the bouts of enabled, open events locking inside the odds window. */
function useUpcomingBouts(
  events: { id: string; enabled: boolean; status: string; lockAtMs: number }[],
  now: number,
) {
  const ids = useMemo(() => {
    const horizon = now + ODDS_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000;
    return events
      .filter((e) => e.enabled && e.status === 'open' && e.lockAtMs > now && e.lockAtMs <= horizon)
      .map((e) => e.id)
      .sort()
      .join(',');
  }, [events, now]);
  const [bouts, setBouts] = useState<Record<string, HealthBout[]>>({});
  useEffect(() => {
    if (!ids) return;
    let cancelled = false;
    void Promise.all(
      ids.split(',').map(async (id) => {
        const snap = await getDocs(collection(db, 'events', id, 'bouts'));
        return [id, snap.docs.map((d) => d.data() as HealthBout)] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setBouts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);
  return bouts;
}

export function AdminHomePage() {
  const { requests, loading: requestsLoading } = useAllTokenRequests();
  const { users, loading: usersLoading } = useAllUsers();
  const { entries, loading: invitesLoading } = useAllowlist();
  const { runs, loading: runsLoading } = useJobRuns();
  const { events, loading: eventsLoading } = useAllEvents();
  // Captured once per visit; reopening the admin page re-checks.
  const [now] = useState(() => Date.now());

  const pendingRequests = requestsLoading ? null : requests.filter((r) => r.status === 'pending').length;
  const playerCount = usersLoading ? null : users.length;
  const joinedEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const pendingInvites = invitesLoading || usersLoading ? null : entries.filter((e) => !joinedEmails.has(e.id)).length;
  const eventCount = eventsLoading ? null : events.length;

  const healthEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        name: e.name,
        enabled: e.enabled,
        status: e.status,
        lockAtMs: e.lockAt.toMillis(),
      })),
    [events],
  );
  const bouts = useUpcomingBouts(healthEvents, now);
  const issues = eventsLoading ? [] : eventIssues(healthEvents, bouts, now);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard to="/admin/events" label="Events" value={eventCount} />
        <StatCard to="/admin/tokens" label="Requests" value={pendingRequests} />
        <StatCard to="/admin/people" label="Players" value={playerCount} />
        <StatCard to="/admin/people" label="Invites" value={pendingInvites} />
      </div>

      <Link to="/admin/help" className="block">
        <Card className="flex items-center justify-between gap-3">
          <div>
            <span className="font-display text-sm uppercase text-text">Admin Help</span>
            <p className="text-xs text-muted">What to do before, during and after a card</p>
          </div>
          <span aria-hidden="true" className="text-muted">
            →
          </span>
        </Card>
      </Link>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase text-muted">Health</h2>
        {issues.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {issues.map((issue) => (
              <li key={issue.text}>
                <Link
                  to={issue.to ?? '/admin/events'}
                  className={clsx(
                    'block rounded-[8px] border px-3 py-2 text-xs',
                    issue.level === 'error' ? 'border-red text-red-text' : 'border-text text-text',
                  )}
                >
                  {issue.level === 'error' ? '✗ ' : '! '}
                  {issue.text}
                </Link>
              </li>
            ))}
          </ul>
        ) : eventsLoading ? null : (
          <p className="text-xs text-muted">✓ Enabled events are visible and upcoming fights have odds.</p>
        )}
        {runsLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run) => {
              const state = jobState(run.id, { lastRunAt: run.lastRunAt?.toMillis() ?? null, ok: run.ok }, now);
              const badge = JOB_BADGE[state];
              return (
                <div key={run.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium capitalize text-text">{run.id}</span>
                  <div className="min-w-0 flex-1 truncate text-right text-xs text-muted">
                    {run.lastRunAt
                      ? `${run.summary} · ${Math.max(0, Math.round((now - run.lastRunAt.toMillis()) / 3600000))}h ago`
                      : 'never run'}
                  </div>
                  <span className={clsx('shrink-0 rounded-chip border px-2 py-0.5 text-xs font-medium', badge.className)}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted">
          Run one by hand: GitHub repo → Actions → Jobs → Run workflow → pick ingest, odds or lifecycle.
        </p>
      </Card>
    </div>
  );
}
