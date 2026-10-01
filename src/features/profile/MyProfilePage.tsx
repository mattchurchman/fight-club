import { MePage } from '../auth/MePage.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { ProfileBody } from './ProfileBody.tsx';

/**
 * `/me` (docs/tasks/T21). `MePage` (T12: account card, sign-out) isn't in this task's allowed
 * files, so this composes it unchanged with the new profile content rather than replacing it.
 */
export function MyProfilePage() {
  const { user } = useSession();

  return (
    <>
      <MePage />
      {user && <ProfileBody uid={user.uid} isSelf viewerUid={user.uid} />}
    </>
  );
}
