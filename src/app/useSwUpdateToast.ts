import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '../components/ui/Toast';

export function useSwUpdateToast() {
  const { show } = useToast();
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  const [needsRefresh] = needRefresh;

  useEffect(() => {
    if (!needsRefresh) return;
    show('Update available, tap to refresh', {
      durationMs: 10000,
      onAction: () => updateServiceWorker(true),
    });
  }, [needsRefresh, show, updateServiceWorker]);
}
