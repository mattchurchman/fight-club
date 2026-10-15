// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Bout, BoutResult } from '@shared/index.ts';
import { useNewResults } from './useNewResults.ts';

type TestBout = Bout<number>;

function result(over: Partial<BoutResult<number>> = {}): BoutResult<number> {
  return { winner: 'A', method: 'DEC', round: 3, time: '5:00', firstBlood: null, source: 'espn', updatedAt: 0, ...over };
}

function bout(over: Partial<TestBout> = {}): TestBout {
  return {
    order: 1,
    weightClass: 'Lightweight',
    rounds: 3,
    isMainEvent: false,
    isMainCard: true,
    a: { fighterId: 'ftr_a', name: 'Fighter A', record: '10-0-0', headshotUrl: null },
    b: { fighterId: 'ftr_b', name: 'Fighter B', record: '9-1-0', headshotUrl: null },
    odds: { a: 100, b: 100, source: 'espn', updatedAt: 0, frozen: true },
    status: 'scheduled',
    result: null,
    ...over,
  };
}

describe('useNewResults', () => {
  it('never flashes a bout that was already final on first load', () => {
    const bouts = { b1: bout({ order: 2, status: 'final', result: result() }) };
    const { result: hook, rerender } = renderHook(({ b }) => useNewResults(b), { initialProps: { b: bouts } });
    expect(hook.current.newResultBoutId).toBeNull();

    rerender({ b: { ...bouts } });
    expect(hook.current.newResultBoutId).toBeNull();
  });

  it('flashes a bout once it turns final after first load', () => {
    const bouts = { b1: bout({ order: 2, status: 'live' }) };
    const { result: hook, rerender } = renderHook(({ b }) => useNewResults(b), { initialProps: { b: bouts } });
    expect(hook.current.newResultBoutId).toBeNull();

    const next = { b1: bout({ order: 2, status: 'final', result: result() }) };
    rerender({ b: next });
    expect(hook.current.newResultBoutId).toBe('b1');

    act(() => hook.current.dismiss());
    expect(hook.current.newResultBoutId).toBeNull();

    rerender({ b: { ...next } });
    expect(hook.current.newResultBoutId).toBeNull();
  });

  it('picks the newest (furthest along fight order) when two go final between renders', () => {
    const bouts = {
      b1: bout({ order: 2, status: 'live' }),
      b2: bout({ order: 1, status: 'scheduled' }),
    };
    const { result: hook, rerender } = renderHook(({ b }) => useNewResults(b), { initialProps: { b: bouts } });

    const next = {
      b1: bout({ order: 2, status: 'final', result: result() }),
      b2: bout({ order: 1, status: 'final', result: result() }),
    };
    rerender({ b: next });
    expect(hook.current.newResultBoutId).toBe('b2');
  });

  it('does not re-show a dismissed result once another new one arrives', () => {
    const bouts = {
      b1: bout({ order: 2, status: 'live' }),
      b2: bout({ order: 1, status: 'scheduled' }),
    };
    const { result: hook, rerender } = renderHook(({ b }) => useNewResults(b), { initialProps: { b: bouts } });

    rerender({ b: { b1: bout({ order: 2, status: 'final', result: result() }), b2: bouts.b2 } });
    expect(hook.current.newResultBoutId).toBe('b1');
    act(() => hook.current.dismiss());

    rerender({
      b: {
        b1: bout({ order: 2, status: 'final', result: result() }),
        b2: bout({ order: 1, status: 'final', result: result() }),
      },
    });
    expect(hook.current.newResultBoutId).toBe('b2');
  });
});
