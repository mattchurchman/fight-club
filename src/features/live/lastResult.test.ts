import { describe, expect, it } from 'vitest';
import type { Bout } from '@shared/index.ts';
import { findLastFinalBout, formatLastResult } from './lastResult.ts';

function ts(ms: number) {
  return { toMillis: () => ms };
}

function bout(overrides: Partial<Bout<ReturnType<typeof ts>>> = {}): Bout<ReturnType<typeof ts>> {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'f1', name: 'Pereira', record: '1-0', headshotUrl: null },
    b: { fighterId: 'f2', name: 'Ankalaev', record: '0-1', headshotUrl: null },
    odds: { a: null, b: null, source: 'espn', updatedAt: ts(0), frozen: true },
    status: 'scheduled',
    result: null,
    ...overrides,
  };
}

describe('findLastFinalBout', () => {
  it('picks the most recently finalized bout', () => {
    const early = bout({ status: 'final', result: { winner: 'A', method: 'DEC', round: null, time: null, firstBlood: null, source: 'espn', updatedAt: ts(100) } });
    const late = bout({ status: 'final', result: { winner: 'B', method: 'KO', round: 2, time: '4:12', firstBlood: null, source: 'espn', updatedAt: ts(200) } });
    expect(findLastFinalBout([early, late])).toBe(late);
  });

  it('ignores bouts that are not yet final', () => {
    expect(findLastFinalBout([bout({ status: 'live' }), bout({ status: 'scheduled' })])).toBeNull();
  });

  it('returns null when nothing has gone final', () => {
    expect(findLastFinalBout([])).toBeNull();
  });
});

describe('formatLastResult', () => {
  it('formats a decisive result with method, round and time', () => {
    const b = bout({
      status: 'final',
      result: { winner: 'A', method: 'KO', round: 2, time: '4:12', firstBlood: null, source: 'espn', updatedAt: ts(0) },
    });
    expect(formatLastResult(b)).toBe('Pereira def. Ankalaev — KO R2 4:12');
  });

  it('formats a decision with no round/time', () => {
    const b = bout({
      status: 'final',
      result: { winner: 'B', method: 'DEC', round: null, time: null, firstBlood: null, source: 'espn', updatedAt: ts(0) },
    });
    expect(formatLastResult(b)).toBe('Ankalaev def. Pereira — DEC');
  });

  it('formats a draw', () => {
    const b = bout({
      status: 'final',
      result: { winner: 'draw', method: 'DEC', round: null, time: null, firstBlood: null, source: 'espn', updatedAt: ts(0) },
    });
    expect(formatLastResult(b)).toBe('Pereira vs Ankalaev — Draw');
  });

  it('returns null when there is no result', () => {
    expect(formatLastResult(bout())).toBeNull();
  });
});
