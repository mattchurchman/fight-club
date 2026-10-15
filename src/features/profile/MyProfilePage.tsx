import { signOut } from 'firebase/auth';
import { Button } from '../../components/ui/Button.tsx';
import { auth } from '../../lib/firebase.ts';
import { NotificationsSection } from '../notifications/NotificationsSection.tsx';
import { MePage } from '../auth/MePage.tsx';
import { useSession } from '../auth/SessionProvider.tsx';
import { ProfileBody } from './ProfileBody.tsx';

/**
 * `/me` (docs/tasks/T21, restyled T30). `MePage` (T12: account card) composes unchanged above
 * the profile content; notifications and sign-out live at the bottom of this page per T30.
 */
export function MyProfilePage() {
  const { user } = useSession();

  return (
    <>
      <MePage />
      {user && <ProfileBody uid={user.uid} isSelf viewerUid={user.uid} />}
      {user && (
        <div className="flex flex-col gap-4 p-4">
          <NotificationsSection uid={user.uid} />
          <Button variant="secondary" onClick={() => void signOut(auth)}>
            Sign out
          </Button>
        </div>
      )}
    </>
  );
}
