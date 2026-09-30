import { describe, expect, it } from 'vitest';
import type { EventStatus } from '@shared/index.ts';
import {
  canCancel,
  canEditCard,
  canEditEventTerms,
  canEnterResult,
  canFinalize,
  canOverrideOdds,
  canRescore,
} from './permissions.ts';

const ALL: readonly EventStatus[] = ['scheduled', 'open', 'locked', 'live', 'final', 'cancelled'];

function only(fn: (status: EventStatus) => boolean, allowed: readonly EventStatus[]) {
  for (const status of ALL) {
    expect(fn(status)).toBe(allowed.includes(status));
  }
}

describe('admin event edit permissions', () => {
  it('gates buy-in / first-blood edits to open', () => {
    only(canEditEventTerms, ['open']);
  });

  it('gates card edits to before lock', () => {
    only(canEditCard, ['scheduled', 'open']);
  });

  it('gates odds overrides to before lock, matching when planLock freezes them', () => {
    only(canOverrideOdds, ['scheduled', 'open']);
  });

  it('gates result entry to locked/live, matching planResults', () => {
    only(canEnterResult, ['locked', 'live']);
  });

  it('gates rescore to locked/live, matching planScores', () => {
    only(canRescore, ['locked', 'live']);
  });

  it('gates finalize to locked/live, matching planFinalize', () => {
    only(canFinalize, ['locked', 'live']);
  });

  it('allows cancelling anything not already settled', () => {
    only(canCancel, ['scheduled', 'open', 'locked', 'live']);
  });
});
