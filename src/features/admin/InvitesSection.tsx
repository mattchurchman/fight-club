import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { AllowlistEntryWithId, UserWithId } from './hooks.ts';
import { useAllowlist, useAppDefaults } from './hooks.ts';
import { createInvite, revokeInvite } from './invites.ts';
import type { Role } from '@shared/index.ts';

function InviteForm() {
  const { user } = useSession();
  const defaultGrant = useAppDefaults();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('player');
  const [grant, setGrant] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startingGrant = grant === '' ? defaultGrant : grant;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!user?.uid) return;
    if (!email.includes('@')) {
      setError('Enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await createInvite(email, role, startingGrant, user.uid);
      setEmail('');
      setRole('player');
      setGrant('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="invite-email" className="mb-1 block text-xs font-semibold uppercase text-muted">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="min-h-11 w-full rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          />
        </div>

        <div className="flex items-center gap-2">
          <Chip selected={role === 'player'} onSelect={() => setRole('player')}>
            Player
          </Chip>
          <Chip selected={role === 'admin'} onSelect={() => setRole('admin')}>
            Admin
          </Chip>
        </div>

        <div>
          <label htmlFor="invite-grant" className="mb-1 block text-xs font-semibold uppercase text-muted">
            Starting grant
          </label>
          <input
            id="invite-grant"
            type="number"
            min={0}
            value={grant === '' ? '' : grant}
            onChange={(e) => setGrant(e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))))}
            placeholder={String(defaultGrant)}
            className="min-h-11 w-full rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          />
        </div>

        {error && <div className="text-sm text-red">{error}</div>}

        <Button type="submit" disabled={loading || !email}>
          {loading ? 'Sending…' : 'Send invite'}
        </Button>
      </form>
    </Card>
  );
}

interface InviteRowProps {
  entry: AllowlistEntryWithId;
  joined: boolean;
}

function InviteRow({ entry, joined }: InviteRowProps) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await revokeInvite(entry.id);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text">{entry.email}</div>
        <div className="text-xs text-muted">
          {entry.role} · {entry.startingGrant} tokens
        </div>
      </div>
      {joined ? (
        <span className="shrink-0 rounded-chip border border-green-500 px-2 py-0.5 text-xs font-medium text-green-500">
          joined
        </span>
      ) : (
        <Button variant="danger" onClick={handleRevoke} disabled={revoking} className="min-h-9 shrink-0 px-3 text-xs">
          {revoking ? 'Revoking…' : 'Revoke'}
        </Button>
      )}
    </div>
  );
}

interface InvitesSectionProps {
  users: UserWithId[];
  usersLoading: boolean;
}

export function InvitesSection({ users, usersLoading }: InvitesSectionProps) {
  const { entries, loading } = useAllowlist();
  const joinedEmails = new Set(users.map((u) => u.email.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <InviteForm />

      {loading || usersLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : entries.length === 0 ? (
        <EmptyState title="No invites yet" description="Add a friend's email above to invite them." />
      ) : (
        <Card className="divide-y divide-line">
          {entries.map((entry) => (
            <InviteRow key={entry.id} entry={entry} joined={joinedEmails.has(entry.id)} />
          ))}
        </Card>
      )}
    </div>
  );
}
