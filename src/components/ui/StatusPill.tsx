import clsx from 'clsx';
import type { EventStatus } from '@shared/index.ts';

interface StatusPillProps {
  status: EventStatus;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  dot?: boolean;
}

const CONFIG: Record<EventStatus, StatusConfig> = {
  scheduled: { label: 'Scheduled', className: 'border border-text text-text' },
  open: { label: 'Picks open', className: 'border border-text text-text' },
  locked: { label: 'Locked', className: 'bg-steel text-muted' },
  live: { label: 'Live', className: 'border border-red-text/40 text-red-text', dot: true },
  final: { label: 'Final', className: 'border border-muted text-muted' },
  cancelled: { label: 'Cancelled', className: 'border border-muted text-muted line-through' },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = CONFIG[status];
  return (
    <span
      className={clsx(
        'inline-flex min-h-6 items-center gap-1.5 rounded-chip px-2.5 py-1',
        '[font-family:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.08em]',
        config.className,
        className,
      )}
    >
      {config.dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-red-text motion-safe:animate-pulse"
        />
      ) : null}
      {config.label}
    </span>
  );
}
