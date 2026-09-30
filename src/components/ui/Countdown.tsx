import { useEffect, useState } from 'react';
import clsx from 'clsx';

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'Locked';

  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface CountdownProps {
  target: number | Date;
  prefix?: string;
  className?: string;
}

export function Countdown({ target, prefix = 'Locks in', className }: CountdownProps) {
  const targetMs = target instanceof Date ? target.getTime() : target;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = targetMs - now;
  const formatted = formatCountdown(remaining);

  return (
    <span className={clsx('tabular-nums', className)}>
      {remaining <= 0 ? formatted : `${prefix} ${formatted}`}
    </span>
  );
}
