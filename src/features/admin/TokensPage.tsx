import { useState } from 'react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { useAllTokenRequests } from './hooks.ts';
import type { TokenRequestWithId } from './hooks.ts';
import { approveTokenRequest, denyTokenRequest } from './tokenRequests.ts';

interface RequestRowProps {
  request: TokenRequestWithId;
}

function RequestRow({ request }: RequestRowProps) {
  const { user } = useSession();
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    if (!user?.uid) return;
    setBusy('approve');
    setError('');
    try {
      await approveTokenRequest(request.id, request.uid, request.amount, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setBusy(null);
    }
  };

  const handleDeny = async () => {
    if (!user?.uid) return;
    setBusy('deny');
    setError('');
    try {
      await denyTokenRequest(request.id, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={request.displayName} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text">{request.displayName}</div>
          <div className="text-xs text-muted">
            {request.amount} tokens{request.note ? ` · "${request.note}"` : ''}
          </div>
        </div>
      </div>
      {request.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <Button onClick={handleApprove} disabled={busy !== null} className="min-h-9 flex-1 text-xs">
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </Button>
          <Button variant="danger" onClick={handleDeny} disabled={busy !== null} className="min-h-9 flex-1 text-xs">
            {busy === 'deny' ? 'Denying…' : 'Deny'}
          </Button>
        </div>
      ) : (
        <span className="self-start rounded-chip border border-line px-2 py-0.5 text-xs font-medium capitalize text-muted">
          {request.status}
        </span>
      )}
      {error && <div className="text-sm text-red">{error}</div>}
    </div>
  );
}

export function TokensPage() {
  const { requests, loading } = useAllTokenRequests();

  if (loading) return <Skeleton className="m-4 h-40" />;
  if (requests.length === 0) return <EmptyState title="No requests yet" />;

  const sorted = [...requests].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return b.createdAt.toMillis() - a.createdAt.toMillis();
  });

  return (
    <div className="p-4">
      <Card className="divide-y divide-line">
        {sorted.map((request) => (
          <RequestRow key={request.id} request={request} />
        ))}
      </Card>
    </div>
  );
}
