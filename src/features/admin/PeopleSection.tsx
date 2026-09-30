import { useState } from 'react';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { GrantAdjustSheet } from './GrantAdjustSheet.tsx';
import type { UserWithId } from './hooks.ts';
import { makeAdmin } from './people.ts';

function lastSeenLabel(user: UserWithId): string {
  return user.lastSeenAt ? user.lastSeenAt.toDate().toLocaleDateString() : 'never';
}

interface PersonRowProps {
  person: UserWithId;
  onAdjust: (person: UserWithId) => void;
}

function PersonRow({ person, onAdjust }: PersonRowProps) {
  const { isAdmin: viewerIsAdmin } = useSession();
  const [promoting, setPromoting] = useState(false);

  const handleMakeAdmin = async () => {
    setPromoting(true);
    try {
      await makeAdmin(person.id);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar name={person.displayName} src={person.photoURL ?? undefined} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-text">{person.displayName}</div>
        <div className="text-xs text-muted">
          {person.balance} tokens · {person.stats?.events ?? 0} events · last seen {lastSeenLabel(person)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {viewerIsAdmin && person.role !== 'admin' && (
          <Button variant="secondary" onClick={handleMakeAdmin} disabled={promoting} className="min-h-9 px-3 text-xs">
            {promoting ? '…' : 'Make admin'}
          </Button>
        )}
        <Button onClick={() => onAdjust(person)} className="min-h-9 px-3 text-xs">
          Adjust
        </Button>
      </div>
    </div>
  );
}

interface PeopleSectionProps {
  users: UserWithId[];
  loading: boolean;
}

export function PeopleSection({ users, loading }: PeopleSectionProps) {
  const [adjusting, setAdjusting] = useState<UserWithId | null>(null);

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (users.length === 0) return <EmptyState title="No players yet" />;

  const sorted = [...users].sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <>
      <Card className="divide-y divide-line">
        {sorted.map((person) => (
          <PersonRow key={person.id} person={person} onAdjust={setAdjusting} />
        ))}
      </Card>
      <GrantAdjustSheet player={adjusting} onClose={() => setAdjusting(null)} />
    </>
  );
}
