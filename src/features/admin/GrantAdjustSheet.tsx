import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/Button.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import type { UserWithId } from './hooks.ts';
import { adjustBalance } from './people.ts';

const PRESETS = [50, 100, 250];

interface GrantAdjustSheetProps {
  player: UserWithId | null;
  onClose: () => void;
}

export function GrantAdjustSheet({ player, onClose }: GrantAdjustSheetProps) {
  const { user } = useSession();
  const [direction, setDirection] = useState<'grant' | 'deduct'>('grant');
  const [amount, setAmount] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setDirection('grant');
    setAmount('');
    setNote('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!player || !user?.uid || !amount) return;

    setLoading(true);
    try {
      const signed = direction === 'grant' ? amount : -amount;
      await adjustBalance(player.id, signed, note, user.uid);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post ledger row');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={player !== null} onClose={handleClose} title={player ? `Adjust ${player.displayName}` : undefined}>
      {player && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">Current balance: {player.balance} tokens</p>

          <div className="flex items-center gap-2">
            <Chip selected={direction === 'grant'} onSelect={() => setDirection('grant')}>
              Grant
            </Chip>
            <Chip selected={direction === 'deduct'} onSelect={() => setDirection('deduct')}>
              Deduct
            </Chip>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-muted">Amount</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Chip key={p} selected={amount === p} onSelect={() => setAmount(p)}>
                  {p}
                </Chip>
              ))}
              <input
                type="number"
                min={1}
                value={amount === '' ? '' : amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(1, Math.floor(Number(e.target.value))))}
                placeholder="Custom"
                className="min-h-11 rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="adjust-note" className="mb-1 block text-xs font-semibold uppercase text-muted">
              Note
            </label>
            <input
              id="adjust-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why?"
              maxLength={100}
              className="min-h-11 w-full rounded-chip border border-line bg-surface-2 px-4 text-sm text-text placeholder-muted focus:border-gold focus:outline-none"
            />
          </div>

          {error && <div className="text-sm text-red">{error}</div>}

          <Button type="submit" disabled={loading || !amount} variant={direction === 'deduct' ? 'danger' : 'primary'}>
            {loading ? 'Posting…' : direction === 'grant' ? 'Grant tokens' : 'Deduct tokens'}
          </Button>
        </form>
      )}
    </Sheet>
  );
}
