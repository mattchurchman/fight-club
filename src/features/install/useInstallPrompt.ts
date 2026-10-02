import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/** `signInWithPopup` is unreliable on mobile browsers (iOS Safari's storage/popup restrictions
 * routinely break the opener/popup handoff silently) — Firebase's own guidance is to use
 * `signInWithRedirect` on mobile instead, desktop only for the nicer no-navigation popup UX. */
export function isMobile(): boolean {
  return /iphone|ipad|ipod|android/i.test(window.navigator.userAgent);
}

export function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const promptInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    setDeferredEvent(null);
  };

  return { canInstall: deferredEvent !== null, promptInstall };
}
