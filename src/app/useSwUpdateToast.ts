import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../components/ui/Toast';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Prompts when a new version is deployed. An installed iPhone app is usually paused, not closed, so it
 * would never re-check on its own: check whenever the app comes back to the screen, and hourly while open.
 * The update only applies when the player taps the toast, so nobody is reloaded mid-pick.
 */
export function useSwUpdateToast() {
  const { show } = useToast();
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (document.visibilityState === 'visible')
          void registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', check);
      setInterval(check, CHECK_EVERY_MS);
    },
  });
  const [needsRefresh] = needRefresh;

  useEffect(() => {
    if (!needsRefresh) return;
    show('New version ready. Tap to update.', {
      durationMs: 15000,
      onAction: () => void updateServiceWorker(true),
    });
  }, [needsRefresh, show, updateServiceWorker]);
}
