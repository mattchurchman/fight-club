import { describe, expect, it } from 'vitest';
import oddsUpcoming from '../../fixtures/espn/odds-upcoming.json' with { type: 'json' };
import { parseBoutOdds, type EspnOddsResponse } from './oddsApi.ts';

// Bout 401907087 (fixtures/espn/odds-upcoming.json): away athlete 5144008 at -625, home athlete
// 4189320 at +455.
const BOUT_401907087 = oddsUpcoming['401907087'] as EspnOddsResponse;

describe('parseBoutOdds', () => {
  it('matches each fighter by athlete id and reports their price', () => {
    expect(parseBoutOdds(BOUT_401907087, 'ftr_5144008', 'ftr_4189320')).toEqual({ a: -625, b: 455 });
  });

  it('matches correctly regardless of which fighter is passed as a vs b (swapped orientation)', () => {
    expect(parseBoutOdds(BOUT_401907087, 'ftr_4189320', 'ftr_5144008')).toEqual({ a: 455, b: -625 });
  });

  it('returns null when neither fighter id appears in the response (unmatched bout)', () => {
    expect(parseBoutOdds(BOUT_401907087, 'ftr_1', 'ftr_2')).toBeNull();
  });

  it('returns null when there are no priced items yet (before fight week, docs/DATA_SOURCES.md §6)', () => {
    const empty: EspnOddsResponse = { count: 0, items: [] };
    expect(parseBoutOdds(empty, 'ftr_5144008', 'ftr_4189320')).toBeNull();
  });

  it('returns a price for only the fighter that appears, when the response is incomplete', () => {
    expect(parseBoutOdds(BOUT_401907087, 'ftr_5144008', 'ftr_999')).toEqual({ a: -625, b: null });
  });

  it('takes the median price per fighter across more than one bookmaker', () => {
    const twoBooks: EspnOddsResponse = {
      count: 2,
      items: [
        {
          provider: { id: '100' },
          awayAthleteOdds: { moneyLine: -600, athlete: { $ref: '.../athletes/5144008?lang=en' } },
          homeAthleteOdds: { moneyLine: 450, athlete: { $ref: '.../athletes/4189320?lang=en' } },
        },
        {
          provider: { id: '200' },
          awayAthleteOdds: { moneyLine: -650, athlete: { $ref: '.../athletes/5144008?lang=en' } },
          homeAthleteOdds: { moneyLine: 460, athlete: { $ref: '.../athletes/4189320?lang=en' } },
        },
      ],
    };
    expect(parseBoutOdds(twoBooks, 'ftr_5144008', 'ftr_4189320')).toEqual({ a: -625, b: 455 });
  });
});
