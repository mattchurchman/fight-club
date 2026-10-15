import { Link } from 'react-router-dom';
import { Mark } from '../components/brand/index.ts';
import { TokenPill } from '../components/ui/TokenPill';
import { useSession } from '../features/auth/SessionProvider';
import { AdminIcon, HelpIcon } from './icons';

interface HeaderProps {
  section: string;
}

export function Header({ section }: HeaderProps) {
  // Only rendered under RequireReady, so profile/isAdmin are always populated here.
  const { profile, isAdmin } = useSession();

  return (
    <header className="safe-top sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[640px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/" aria-label="Fight Club home" className="shrink-0">
            <Mark className="size-7" />
          </Link>
          <span className="label truncate">{section}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TokenPill balance={profile?.balance ?? 0} />
          <Link
            to="/help"
            aria-label="How it works"
            className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:text-text"
          >
            <HelpIcon className="size-5" />
          </Link>
          {isAdmin ? (
            <Link
              to="/admin"
              aria-label="Admin"
              className="inline-flex size-11 items-center justify-center rounded-xl text-muted hover:text-text"
            >
              <AdminIcon className="size-5" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
