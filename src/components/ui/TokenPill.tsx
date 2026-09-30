import clsx from 'clsx';

interface TokenPillProps {
  balance: number;
  className?: string;
}

export function TokenPill({ balance, className }: TokenPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex min-h-8 items-center gap-1.5 rounded-chip border border-line',
        'bg-surface-2 px-3 text-sm font-semibold tabular-nums text-gold',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" fill="var(--color-surface-2)" />
      </svg>
      {balance}
    </span>
  );
}
