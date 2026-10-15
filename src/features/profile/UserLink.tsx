import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useUsersById } from './hooks.ts';

interface UserLinkProps {
  uid?: string | null;
  username?: string | null;
  children: ReactNode;
  className?: string;
}

/** Every name/avatar should lead to a profile (docs/tasks/T41). Resolves `uid` to a username via
 * `useUsersById().byId` when `username` isn't already known; falls back to plain text (not a
 * link) if the player can't be resolved — e.g. they left the group. */
export function UserLink({ uid, username, children, className }: UserLinkProps) {
  const { byId } = useUsersById();
  const resolved = username ?? (uid ? byId[uid]?.username : undefined);

  if (!resolved) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link to={`/u/${resolved}`} className={className}>
      {children}
    </Link>
  );
}
