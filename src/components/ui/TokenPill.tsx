import clsx from 'clsx';
import { Coin } from '../brand/Brand';

interface TokenPillProps {
  balance: number;
  className?: string;
}

export function TokenPill({ balance, className }: TokenPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-line',
        'bg-surface-2 px-3 text-sm font-semibold tabular-nums text-text',
        className,
      )}
    >
      <Coin className="size-4 text-text" />
      {balance}
    </span>
  );
}
