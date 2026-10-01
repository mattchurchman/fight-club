import { useParams } from 'react-router-dom';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { Skeleton } from '../../components/ui/Skeleton.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { ProfileBody } from './ProfileBody.tsx';
import { useUidForUsername } from './hooks.ts';

/** `/u/:username` (docs/tasks/T21) — resolves the username to a uid, then renders their profile. */
export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useSession();
  const uid = useUidForUsername(username?.toLowerCase() ?? null);

  if (uid === undefined) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (uid === null) {
    return <EmptyState title="Player not found" description="Check the link and try again." />;
  }

  return <ProfileBody uid={uid} isSelf={uid === user?.uid} viewerUid={user?.uid ?? null} />;
}
