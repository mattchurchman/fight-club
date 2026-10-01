import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { useNotificationToggle } from './useNotificationToggle.ts';

/**
 * "Enable notifications" toggle for `/me` (docs/tasks/T24). Not wired into `/me` itself —
 * `src/features/auth/MePage.tsx` and `src/features/profile/MyProfilePage.tsx` aren't in this
 * task's allowed files (see PROGRESS.md backlog, same gap T18/T21 hit for other pages). Add
 * `<NotificationsSection uid={user.uid} />` to one of them to surface it.
 */
export function NotificationsSection({ uid }: { uid: string }) {
  const { state, busy, enable, disable } = useNotificationToggle(uid);

  if (state === 'checking' || state === 'unsupported') return null;

  return (
    <Card className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-text">Notifications</p>
      {state === 'needsInstall' && (
        <p className="text-sm text-muted">
          Install the app to your Home Screen first, then come back to enable notifications.{' '}
          <Link to="/install" className="text-gold underline underline-offset-2">
            Install
          </Link>
        </p>
      )}
      {state === 'denied' && (
        <p className="text-sm text-muted">
          Notifications are blocked for this site — enable them in your browser's site settings.
        </p>
      )}
      {(state === 'off' || state === 'on') && (
        <>
          <p className="text-sm text-muted">
            Picks locking soon, your results, and token request updates.
          </p>
          <Button
            variant={state === 'on' ? 'secondary' : 'primary'}
            loading={busy}
            onClick={() => void (state === 'on' ? disable() : enable())}
          >
            {state === 'on' ? 'Turn off notifications' : 'Enable notifications'}
          </Button>
        </>
      )}
    </Card>
  );
}
