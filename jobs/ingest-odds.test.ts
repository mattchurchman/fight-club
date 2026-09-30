import { describe, expect, it } from 'vitest';
import { planBoutOdds, type CandidateBout } from './ingest-odds.ts';
import type { EspnOddsResponse } from './lib/oddsApi.ts';

const NOW = '2026-09-29T00:00:00.000Z';

function bout(overrides: Partial<CandidateBout> = {}): CandidateBout {
  return {
    id: 'bout_401907087',
    espnId: '401907087',
    aFighterId: 'ftr_5144008',
    bFighterId: 'ftr_4189320',
    oddsSource: 'default',
    oddsFrozen: false,
    ...overrides,
  };
}

const PRICED: EspnOddsResponse = {
  count: 1,
  items: [
    {
      provider: { id: '100' },
      awayAthleteOdds: { moneyLine: -625, athlete: { $ref: '.../athletes/5144008?lang=en' } },
      homeAthleteOdds: { moneyLine: 455, athlete: { $ref: '.../athletes/4189320?lang=en' } },
    },
  ],
};

describe('planBoutOdds', () => {
  it('writes both prices with source espn when the bout is unmatched, unfrozen', () => {
    const plan = planBoutOdds(bout(), PRICED, NOW);
    expect(plan).toEqual({
      action: 'write',
      boutId: 'bout_401907087',
      data: { a: -625, b: 455, source: 'espn', updatedAt: NOW, frozen: false },
    });
  });

  it('never overwrites odds.source manual, and does not need a response to decide that', () => {
    const plan = planBoutOdds(bout({ oddsSource: 'manual' }), undefined, NOW);
    expect(plan).toEqual({ action: 'skip', boutId: 'bout_401907087', reason: 'manual' });
  });

  it('never overwrites frozen odds, even if a response is supplied', () => {
    const plan = planBoutOdds(bout({ oddsFrozen: true }), PRICED, NOW);
    expect(plan).toEqual({ action: 'skip', boutId: 'bout_401907087', reason: 'frozen' });
  });

  it('skips when the bout has no price yet, leaving existing odds untouched by the caller', () => {
    const plan = planBoutOdds(bout(), undefined, NOW);
    expect(plan).toEqual({ action: 'skip', boutId: 'bout_401907087', reason: 'no-price' });
  });

  it('skips when the response has no items for this bout (unmatched)', () => {
    const empty: EspnOddsResponse = { count: 0, items: [] };
    const plan = planBoutOdds(bout(), empty, NOW);
    expect(plan).toEqual({ action: 'skip', boutId: 'bout_401907087', reason: 'no-price' });
  });
});
