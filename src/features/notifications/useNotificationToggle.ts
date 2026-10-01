import { useEffect, useRef, useState } from 'react';
import {
  checkAvailability,
  disablePush,
  enablePush,
  getExistingToken,
  isTokenSaved,
  type NotificationAvailability,
} from './push.ts';

export type ToggleState = NotificationAvailability | 'checking' | 'denied' | 'off' | 'on';

export interface UseNotificationToggleResult {
  state: ToggleState;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/** Drives the `/me` "Enable notifications" toggle. Reflects what's actually saved on this
 *  device's token, not just the browser permission, so a cleared device doc shows as off even
 *  with permission already granted. */
export function useNotificationToggle(uid: string | undefined): UseNotificationToggleResult {
  const [state, setState] = useState<ToggleState>('checking');
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    void (async () => {
      const availability = await checkAvailability();
      if (cancelled) return;
      if (availability !== 'available') {
        setState(availability);
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }

      try {
        const token = await getExistingToken();
        if (cancelled) return;
        tokenRef.current = token;
        if (!token) {
          setState('off');
          return;
        }
        setState((await isTokenSaved(uid, token)) ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('off');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const enable = async () => {
    if (!uid || busy) return;
    setBusy(true);
    try {
      const token = await enablePush(uid);
      tokenRef.current = token;
      setState(token ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!uid || !tokenRef.current || busy) return;
    setBusy(true);
    try {
      await disablePush(uid, tokenRef.current);
      tokenRef.current = null;
      setState('off');
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, enable, disable };
}
