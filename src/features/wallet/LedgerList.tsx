import clsx from 'clsx';
import type { LedgerRowWithId } from './hooks';
import { formatLedgerLabelFull } from './ledgerLabels';
import { Skeleton } from '../../components/ui/Skeleton';

interface LedgerListProps {
  rows: LedgerRowWithId[];
  loading: boolean;
}

export function LedgerList({ rows, loading }: LedgerListProps) {
  if (loading) {
    return (
      <div className="space-y-2 px-4 py-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {rows.map((row) => {
        const label = formatLedgerLabelFull(row);
        const isPositive = row.amount >= 0;

        return (
          <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-text">{label}</div>
              <div className="text-xs text-muted">
                {row.createdAt.toMillis ? new Date(row.createdAt.toMillis()).toLocaleDateString() : ''}
              </div>
            </div>
            <div className={clsx('ml-2 font-semibold tabular-nums', isPositive ? 'text-green-500' : 'text-red-500')}>
              {row.amount >= 0 ? '+' : ''}{row.amount}
            </div>
          </div>
        );
      })}
    </div>
  );
}
