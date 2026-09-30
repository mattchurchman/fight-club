import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { isIos, isStandalone, useInstallPrompt } from './useInstallPrompt';

export function InstallPage() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const ios = isIos();
  const installed = isStandalone();

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="font-display text-2xl uppercase">Install Fight Club</h2>

      {installed ? (
        <Card>
          <p className="text-sm text-muted">You're already using the installed app. 🥊</p>
        </Card>
      ) : ios ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-text">On iPhone (Safari):</p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted">
            <li>
              Tap the <strong className="text-text">Share</strong> icon in the toolbar.
            </li>
            <li>
              Scroll down and tap <strong className="text-text">Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong className="text-text">Add</strong>.
            </li>
          </ol>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text">On Android (Chrome):</p>
          {canInstall ? (
            <Button onClick={promptInstall}>Install app</Button>
          ) : (
            <p className="text-sm text-muted">
              Open the browser menu and tap <strong className="text-text">Install app</strong> or{' '}
              <strong className="text-text">Add to Home screen</strong>.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
