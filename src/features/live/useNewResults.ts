import { useCallback, useEffect, useRef, useState } from 'react';
import type { Bout } from '@shared/index.ts';
import { fightOrder } from './derive.ts';

/**
 * Tracks bouts turning `final` while the Live tab is open (docs/tasks/T38). Bouts already
 * final on first load never flash — only ones that become final afterwards do. When more than
 * one turns final between renders, the newest (furthest along `fightOrder`) wins. Returns `null`
 * once there's nothing to show, or after `dismiss()`.
 */
export function useNewResults<Ts>(bouts: Record<string, Bout<Ts>> | undefined): {
  newResultBoutId: string | null;
  dismiss: () => void;
} {
  const seenFinalRef = useRef<Set<string> | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const [newResultBoutId, setNewResultBoutId] = useState<string | null>(null);

  useEffect(() => {
    if (!bouts) return;
    const finalIds = Object.keys(bouts).filter((id) => bouts[id]!.status === 'final');

    if (seenFinalRef.current === null) {
      seenFinalRef.current = new Set(finalIds);
      return;
    }

    const newlyFinal = finalIds.filter((id) => !seenFinalRef.current!.has(id));
    newlyFinal.forEach((id) => seenFinalRef.current!.add(id));
    const unshown = newlyFinal.filter((id) => !shownRef.current.has(id));
    if (unshown.length === 0) return;

    const order = fightOrder(bouts);
    const newest = unshown.reduce((latest, id) => (order.indexOf(id) > order.indexOf(latest) ? id : latest));
    shownRef.current.add(newest);
    setNewResultBoutId(newest);
  }, [bouts]);

  const dismiss = useCallback(() => setNewResultBoutId(null), []);

  return { newResultBoutId, dismiss };
}
