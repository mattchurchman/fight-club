import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../../components/ui/Card.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useAllTokenRequests, useAllUsers, useAllowlist, useJobRuns } from './hooks.ts';

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

export function AdminHomePage() {
  const { requests, loading: requestsLoading } = useAllTokenRequests();
  const { users, loading: usersLoading } = useAllUsers();
  const { entries, loading: invitesLoading } = useAllowlist();
  const { runs, loading: runsLoading } = useJobRuns();

  const pendingRequests = requestsLoading ? null : requests.filter((r) => r.status === 'pending').length;
  const playerCount = usersLoading ? null : users.length;
  const joinedEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const pendingInvites = invitesLoading || usersLoading ? null : entries.filter((e) => !joinedEmails.has(e.id)).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard to="/admin/tokens" label="Requests" value={pendingRequests} />
        <StatCard to="/admin/people" label="Players" value={playerCount} />
        <StatCard to="/admin/people" label="Invites" value={pendingInvites} />
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase text-muted">Jobs</h2>
        {runsLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run) => (
              <div key={run.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium capitalize text-text">{run.id}</span>
                <div className="min-w-0 flex-1 truncate text-right text-xs text-muted">
                  {run.lastRunAt ? run.summary : 'never run'}
                </div>
                <span
                  className={clsx(
                    'shrink-0 rounded-chip border px-2 py-0.5 text-xs font-medium',
                    run.ok === null
                      ? 'border-line text-muted'
                      : run.ok
                        ? 'border-green-500 text-green-500'
                        : 'border-red text-red',
                  )}
                >
                  {run.ok === null ? '—' : run.ok ? 'ok' : 'error'}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted">
          Run one by hand: GitHub repo → Actions → Jobs → Run workflow → pick ingest, odds or lifecycle.
        </p>
      </Card>
    </div>
  );
}
