import { describe, expect, it } from 'vitest';
import scoreboardUpcoming from '../../fixtures/espn/scoreboard-upcoming.json' with { type: 'json' };
import scoreboardCompleted from '../../fixtures/espn/scoreboard-completed-331.json' with { type: 'json' };
import eventCompleted331 from '../../fixtures/espn/event-completed-331.json' with { type: 'json' };
import competitionStatus from '../../fixtures/espn/competition-status.json' with { type: 'json' };
import { headshotUrl, parseEvents, parseMainCard, parseResult, type EspnEvent, type EspnScoreboard } from './espn.ts';

describe('parseEvents', () => {
  it('parses UFC 332 as a numbered, enabled event with the main-card-only bout count', () => {
    const [event] = parseEvents(scoreboardUpcoming as EspnScoreboard);
    expect(event).toBeDefined();
    expect(event?.espnId).toBe('600061182');
    expect(event?.name).toBe('UFC 332: Silva vs. Wang');
    expect(event?.subtitle).toBe('Silva vs. Wang');
    expect(event?.number).toBe(332);
    expect(event?.kind).toBe('numbered');
    expect(event?.venue).toBe('Delta Center, Salt Lake City, UT');
    expect(event?.bouts).toHaveLength(5);
  });

  it('detects numbered events from shortName, not name (UFC 335 has no subtitle)', () => {
    const scoreboard: EspnScoreboard = {
      events: [{ ...scoreboardUpcoming.events[0]!, id: '999', shortName: 'UFC 335', name: 'UFC 335' }],
    };
    const [event] = parseEvents(scoreboard);
    expect(event?.number).toBe(335);
    expect(event?.kind).toBe('numbered');
    expect(event?.subtitle).toBeNull();
  });

  it('classifies a non-numbered, non-Fight-Night card as special, and Fight Night as fightnight', () => {
    const base = scoreboardUpcoming.events[0]!;
    const scoreboard: EspnScoreboard = {
      events: [
        { ...base, id: '1', shortName: 'Noche UFC', name: 'Noche UFC: Silva vs. Delgado' },
        { ...base, id: '2', shortName: 'UFC Fight Night', name: 'UFC Fight Night: Rosas Jr. vs. Barcelos' },
      ],
    };
    const [noche, fightNight] = parseEvents(scoreboard);
    expect(noche?.kind).toBe('special');
    expect(noche?.number).toBeNull();
    expect(fightNight?.kind).toBe('fightnight');
  });

  it('skips Dana White\'s Contender Series entirely', () => {
    const base = scoreboardUpcoming.events[0]!;
    const scoreboard: EspnScoreboard = {
      events: [{ ...base, id: '3', shortName: "Dana White's Contender Series", name: "DWCS: Season 10, Week 8" }],
    };
    expect(parseEvents(scoreboard)).toHaveLength(0);
  });
});

describe('parseMainCard', () => {
  it('returns only the main-card bouts, ordered main event first, for the upcoming card', () => {
    const bouts = parseMainCard(scoreboardUpcoming.events[0] as EspnEvent);
    expect(bouts).toHaveLength(5);
    expect(bouts.map((b) => b.order)).toEqual([1, 2, 3, 4, 5]);
    expect(bouts[0]?.isMainEvent).toBe(true);
    expect(bouts[0]?.a.name).toBe('Natalia Silva');
    expect(bouts[0]?.b.name).toBe('Wang Cong');
    expect(bouts.slice(1).every((b) => !b.isMainEvent)).toBe(true);
  });

  it('matches the completed event\'s verified main-card split (5 bouts, main event 401903509)', () => {
    const bouts = parseMainCard(scoreboardCompleted.events[0] as EspnEvent);
    expect(bouts).toHaveLength(5);
    expect(bouts[0]?.espnId).toBe('401903509');
    expect(bouts.map((b) => b.espnId)).toEqual(
      eventCompleted331.competitions
        .filter((c) => c.cardSegment.name === 'main')
        .map((c) => c.id)
        .reverse(),
    );
  });

  it('builds records, headshot URLs and a Women\'s-prefixed weight class', () => {
    const bouts = parseMainCard(scoreboardUpcoming.events[0] as EspnEvent);
    const womensBout = bouts.find((b) => b.espnId === '401912278');
    expect(womensBout).toBeDefined();
    if (!womensBout) throw new Error('unreachable');
    expect(womensBout.weightClass).toBe("Women's Flyweight");
    expect(womensBout.a.record).toMatch(/^\d+-\d+-\d+$/);
    expect(womensBout.a.headshotUrl).toBe(headshotUrl(womensBout.a.espnId));
    expect(womensBout.a.headshotUrl).toBe(
      `https://a.espncdn.com/i/headshots/mma/players/full/${womensBout.a.espnId}.png`,
    );
  });
});

describe('parseResult', () => {
  it('maps every verified result type to our method/winner vocabulary', () => {
    for (const comp of eventCompleted331.competitions) {
      const status = (competitionStatus as Record<string, { period?: number; displayClock?: string; result?: { id: number; name: string } }>)[
        comp.id
      ];
      expect(status).toBeDefined();
      const result = parseResult(status!, comp.competitors);
      expect(result).not.toBeNull();
      const expectedWinnerCorner = comp.competitors.find((c) => c.winner)?.order === 1 ? 'A' : 'B';
      if (status!.result!.name === 'kotko') {
        expect(result?.method).toBe('KO');
        expect(result?.winner).toBe(expectedWinnerCorner);
      }
      if (status!.result!.name === 'submission') expect(result?.method).toBe('SUB');
      if (status!.result!.name.startsWith('decision')) expect(result?.method).toBe('DEC');
    }
  });

  it('handles draw, no-contest and dq', () => {
    const draw = parseResult({ period: 3, displayClock: '5:00', result: { id: 269, name: 'draw' } }, [
      { order: 1, winner: false },
      { order: 2, winner: false },
    ]);
    expect(draw).toEqual({ winner: 'draw', method: 'DEC', round: 3, time: '5:00' });

    const nc = parseResult({ period: 2, displayClock: '1:45', result: { id: 277, name: 'no-contest' } }, [
      { order: 1, winner: false },
      { order: 2, winner: false },
    ]);
    expect(nc).toEqual({ winner: 'nc', method: 'OTHER', round: 2, time: '1:45' });

    const dq = parseResult({ period: 1, displayClock: '2:30', result: { id: 264, name: 'dq' } }, [
      { order: 1, winner: false },
      { order: 2, winner: true },
    ]);
    expect(dq).toEqual({ winner: 'B', method: 'DQ', round: 1, time: '2:30' });
  });

  it('returns null when the bout has no result yet', () => {
    expect(parseResult({ period: 0, displayClock: '-' }, [])).toBeNull();
  });
});
