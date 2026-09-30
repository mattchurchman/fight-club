import { scoreBout } from '@shared/index.ts';
import type { Bout, Pick } from '@shared/index.ts';

/**
 * "If right: +N pts" (docs/tasks/T14 §2, docs/DESIGN.md BoutCard): what this pick would score
 * if the fight goes exactly as picked. Reuses `scoreBout` (docs/GAME_RULES.md §4) against a
 * hypothetical result matching the pick, so it stays exact as the rules evolve.
 */
export function previewPickScore<Ts>(pick: Pick, bout: Bout<Ts>, isLock: boolean): number | null {
  if (bout.status === 'cancelled') return null;
  const hypothetical: Bout<Ts> = {
    ...bout,
    result: {
      winner: pick.winner,
      method: pick.method,
      round: null,
      time: null,
      firstBlood: null,
      source: 'manual',
      updatedAt: bout.odds.updatedAt,
    },
  };
  return scoreBout(pick, hypothetical, isLock)?.total ?? null;
}
