import { describe, expect, it } from 'vitest';
import { submitLabel } from './submitLabel.ts';

function state(overrides: Partial<Parameters<typeof submitLabel>[0]> = {}) {
  return {
    broke: false,
    missingPicks: 0,
    budgetDiff: 0,
    hasLock: true,
    hasEntry: false,
    ...overrides,
  };
}

describe('submitLabel', () => {
  it('leads with broke, even when other conditions are also unmet', () => {
    expect(submitLabel(state({ broke: true, missingPicks: 2, hasLock: false }))).toEqual({
      label: "You're broke. Beg the admin.",
      ready: false,
    });
  });

  it('reports missing picks before budget or lock', () => {
    expect(submitLabel(state({ missingPicks: 3, budgetDiff: 100, hasLock: false }))).toEqual({
      label: 'Pick 3 more fights',
      ready: false,
    });
  });

  it('reports points left when under budget', () => {
    expect(submitLabel(state({ budgetDiff: -150 }))).toEqual({
      label: 'Adjust stakes: 150 left',
      ready: false,
    });
  });

  it('reports points over when over budget', () => {
    expect(submitLabel(state({ budgetDiff: 75 }))).toEqual({
      label: 'Adjust stakes: 75 over',
      ready: false,
    });
  });

  it('asks for a lock once the budget is exact', () => {
    expect(submitLabel(state({ hasLock: false }))).toEqual({
      label: 'Choose your lock',
      ready: false,
    });
  });

  it('is ready to submit a new entry once every condition is met', () => {
    expect(submitLabel(state())).toEqual({ label: 'Submit picks', ready: true });
  });

  it('offers to update an existing entry instead of submitting a new one', () => {
    expect(submitLabel(state({ hasEntry: true }))).toEqual({
      label: 'Update picks',
      ready: true,
    });
  });
});
