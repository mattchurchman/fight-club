import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TokenPill } from '../components/ui/TokenPill';
import { AdminIcon } from './icons';

interface HeaderProps {
  title: string;
  subtitle?: ReactNode;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="safe-top sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl uppercase tracking-wide">{title}</h1>
          {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TokenPill balance={0} />
          <Link
            to="/admin"
            aria-label="Admin"
            className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:text-text"
          >
            <AdminIcon className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
