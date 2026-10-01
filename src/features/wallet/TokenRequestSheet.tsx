import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import clsx from 'clsx';
import type { TokenRequestStatus } from '@shared/index.ts';
import { db } from '../../lib/firebase.ts';
import { useSession } from '../auth/SessionProvider';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import type { TokenRequestWithId } from './hooks';

const PRESETS = [100, 250, 500];
const MAX_AMOUNT = 1000;

interface TokenRequestSheetProps {
  open: boolean;
  onClose: () => void;
  requests: TokenRequestWithId[];
  onSuccess?: () => void;
}

const statusColors: Record<TokenRequestStatus, string> = {
  pending: 'bg-blue/15 text-blue border-blue',
  approved: 'bg-green-500/15 text-green-500 border-green-500',
  denied: 'bg-red/15 text-red border-red',
};

export function TokenRequestSheet({ open, onClose, requests, onSuccess }: TokenRequestSheetProps) {
  const { profile, user } = useSession();
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingRequest = requests.find((r) => r.status === 'pending');
  const hasPending = !!pendingRequest;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user?.uid || !profile) return;

    const uid = user.uid;

    if (!amount || amount < 1 || amount > MAX_AMOUNT) {
      setError(`Amount must be between 1 and ${MAX_AMOUNT}`);
      return;
    }

    if (hasPending) {
      setError('You already have a pending request. Wait for a response.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'tokenRequests'), {
        uid,
        displayName: profile.displayName,
        amount: Math.floor(amount),
        note: note || null,
        status: 'pending',
        createdAt: serverTimestamp(),
        resolvedBy: null,
        resolvedAt: null,
      });
      setAmount('');
      setNote('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Request Tokens">
      <div className="space-y-4">
        {/* Request history */}
        {requests.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Your requests</h3>
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-text">{req.amount} tokens</div>
                    {req.note && <div className="text-xs text-muted truncate">"{req.note}"</div>}
                  </div>
                  <span
                    className={clsx(
                      'ml-2 rounded-chip border px-2 py-1 text-xs font-medium',
                      statusColors[req.status],
                    )}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPending && (
            <div className="rounded-lg border border-blue/30 bg-blue/10 p-3 text-sm text-blue">
              You have a pending request. Wait for approval before requesting more.
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-muted">Amount</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip
                  key={p}
                  selected={amount === p}
                  onSelect={() => setAmount(p)}
                  disabled={hasPending}
                >
                  {p}
                </Chip>
              ))}
              <label className="relative">
                <input
                  type="number"
                  min="1"
                  max={MAX_AMOUNT}
                  value={amount === '' ? '' : amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="Custom"
                  disabled={hasPending}
                  className={clsx(
                    'min-h-11 rounded-chip border px-4 text-sm',
                    'bg-surface-2 text-text placeholder-muted',
                    'border-line focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                    hasPending && 'opacity-50',
                  )}
                />
              </label>
            </div>
            {amount && (amount < 1 || amount > MAX_AMOUNT) && (
              <div className="mt-1 text-xs text-red">Max {MAX_AMOUNT} tokens</div>
            )}
          </div>

          <div>
            <label htmlFor="note" className="mb-2 block text-xs font-semibold uppercase text-muted">
              Note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why do you need these tokens?"
              disabled={hasPending}
              maxLength={100}
              className={clsx(
                'w-full rounded-lg border border-line bg-surface-2 p-3 text-sm',
                'text-text placeholder-muted focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                hasPending && 'opacity-50',
              )}
              rows={3}
            />
          </div>

          {error && <div className="text-sm text-red">{error}</div>}

          <Button type="submit" disabled={hasPending || !amount || loading} className="w-full">
            {loading ? 'Sending...' : 'Request Tokens'}
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
