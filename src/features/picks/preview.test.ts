import type { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import type { Bout } from '@shared/index.ts';
import { previewPickScore } from './preview.ts';

const ts = { toMillis: () => 0 } as unknown as Timestamp;

function bout(overrides: Partial<Bout<Timestamp>> = {}): Bout<Timestamp> {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: 150, b: -180, source: 'espn', updatedAt: ts, frozen: false },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

describe('previewPickScore', () => {
  // docs/GAME_RULES.md E1: stake 200 on +150, method correct, not lock -> 700
  it('matches worked example E1', () => {
    const total = previewPickScore({ winner: 'A', method: 'SUB', stake: 200 }, bout(), false);
    expect(total).toBe(700);
  });

  // docs/GAME_RULES.md E3: same as E1 but it's the lock -> 1200
  it('matches worked example E3 (same pick as the Lock of the Night)', () => {
    const total = previewPickScore({ winner: 'A', method: 'SUB', stake: 200 }, bout(), true);
    expect(total).toBe(1200);
  });

  it('returns null for a cancelled bout (a push has no upside to preview)', () => {
    const total = previewPickScore(
      { winner: 'A', method: 'SUB', stake: 200 },
      bout({ status: 'cancelled' }),
      false,
    );
    expect(total).toBeNull();
  });
});
