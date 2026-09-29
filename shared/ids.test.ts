import { describe, expect, it } from 'vitest';
import { boutId, eventId, fighterId, h2hId, parseEventNumber } from './ids';

describe('id builders', () => {
  it('prefixes ESPN ids per docs/DATA_MODEL.md', () => {
    expect(eventId('600123')).toBe('evt_600123');
    expect(boutId('401234')).toBe('bout_401234');
    expect(fighterId('998877')).toBe('ftr_998877');
  });
});

describe('h2hId', () => {
  it('sorts uids so order does not matter', () => {
    expect(h2hId('uidB', 'uidA')).toBe(h2hId('uidA', 'uidB'));
  });

  it('joins with a double underscore', () => {
    expect(h2hId('abc', 'xyz')).toBe('abc__xyz');
  });
});

describe('parseEventNumber', () => {
  it('parses a 3-digit numbered event', () => {
    expect(parseEventNumber('UFC 332')).toBe(332);
  });

  it('parses a 4-digit numbered event', () => {
    expect(parseEventNumber('UFC 1000')).toBe(1000);
  });

  it('returns null for Fight Night', () => {
    expect(parseEventNumber('UFC Fight Night')).toBeNull();
  });

  it('returns null for a special card whose name contains a number', () => {
    expect(parseEventNumber('UFC Freedom 250')).toBeNull();
  });

  it('does not match on the full `name` field, only `shortName`', () => {
    expect(parseEventNumber('UFC 332: Silva vs. Wang')).toBeNull();
  });
});
