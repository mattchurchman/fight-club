import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import type { EntrantWithId } from './hooks.ts';

interface WhosInProps {
  entrants: EntrantWithId[];
  selfUid: string | null;
  usernameByUid: Readonly<Record<string, string>>;
}

function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

/** Pre-lock Live tab: who's entered so far (docs/tasks/T60). */
export function WhosIn({ entrants, selfUid, usernameByUid }: WhosInProps) {
  const hasOwnEntry = selfUid != null && entrants.some((entrant) => entrant.uid === selfUid);

  if (entrants.length === 0) {
    return (
      <EmptyState
        title="Nobody's in yet"
        description="Be first."
        action={
          !hasOwnEntry ? (
            <Link
              to="/"
              className="font-display text-sm font-bold uppercase tracking-[0.08em] text-text underline"
            >
              Make picks
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      <SectionLabel>WHO&apos;S IN · {entrants.length}</SectionLabel>
      <div className="flex flex-wrap gap-3">
        {entrants.map((entrant) => {
          const username = usernameByUid[entrant.uid];
          const isSelf = entrant.uid === selfUid;
          const content = (
            <span className="flex w-16 flex-col items-center gap-1">
              <Avatar
                name={entrant.displayName}
                src={entrant.photoURL ?? undefined}
                size={40}
                className={clsx(isSelf && 'ring-2 ring-text')}
              />
              <span className="w-full truncate text-center text-xs font-medium">
                {firstNameOf(entrant.displayName)}
              </span>
            </span>
          );

          return username ? (
            <Link
              key={entrant.uid}
              to={`/u/${username}`}
              aria-label={`View ${entrant.displayName}'s profile`}
              className="flex min-h-11 items-center"
            >
              {content}
            </Link>
          ) : (
            <span
              key={entrant.uid}
              aria-label={entrant.displayName}
              className="flex min-h-11 items-center"
            >
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
