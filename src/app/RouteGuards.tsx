import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '../components/ui/Skeleton.tsx';
import { NotInvitedPage } from '../features/auth/NotInvitedPage.tsx';
import { OnboardingPage } from '../features/auth/OnboardingPage.tsx';
import { useSession } from '../features/auth/SessionProvider.tsx';

function FullScreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

/** Everything except /login and /install requires `ready` (docs/tasks/T12-auth-invites-onboarding.md). */
export function RequireReady({ children }: { children: ReactNode }) {
  const { status } = useSession();

  switch (status) {
    case 'loading':
      return <FullScreenLoading />;
    case 'signedOut':
      return <Navigate to="/login" replace />;
    case 'notInvited':
      return <NotInvitedPage />;
    case 'needsProfile':
      return <OnboardingPage />;
    case 'ready':
      return <>{children}</>;
  }
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useSession();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}
