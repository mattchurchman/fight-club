import { signOut } from 'firebase/auth';
import { Button } from '../../components/ui/Button.tsx';
import { EmptyState } from '../../components/ui/EmptyState.tsx';
import { auth } from '../../lib/firebase.ts';
import { useSession } from './SessionProvider.tsx';

export function NotInvitedPage() {
  const { user } = useSession();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <EmptyState
        title="Invite only"
        description={`${user?.email ?? 'This account'} hasn't been invited to Fight Club yet. Ask an admin for an invite, then sign in again with that exact email.`}
        action={
          <Button variant="secondary" onClick={() => signOut(auth)}>
            Sign out
          </Button>
        }
      />
    </div>
  );
}
