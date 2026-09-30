import { describe, it, expect } from 'vitest';
import { formatLedgerLabelFull } from './ledgerLabels';
import type { LedgerRow } from '@shared/index.ts';
import type { Timestamp } from 'firebase/firestore';

const mockTimestamp = { toMillis: () => 0 } as Timestamp;

describe('formatLedgerLabelFull', () => {
  it('formats buy-in with event name', () => {
    const row: LedgerRow = {
      uid: 'user1',
      amount: -100,
      type: 'buyin',
      eventId: 'evt_123',
      note: null,
      createdBy: 'system',
      createdAt: mockTimestamp,
      balanceAfter: 400,
    };

    expect(formatLedgerLabelFull(row, 'UFC 320')).toBe('Buy-in · UFC 320 -100');
  });

  it('formats payout with event name and positive amount', () => {
    const row: LedgerRow = {
      uid: 'user1',
      amount: 350,
      type: 'payout',
      eventId: 'evt_123',
      note: null,
      createdBy: 'system',
      createdAt: mockTimestamp,
      balanceAfter: 750,
    };

    expect(formatLedgerLabelFull(row, 'UFC 320')).toBe('Payout · UFC 320 +350');
  });

  it('formats grant with note', () => {
    const row: LedgerRow = {
      uid: 'user1',
      amount: 500,
      type: 'grant',
      eventId: null,
      note: 'lol pay me back',
      createdBy: 'admin1',
      createdAt: mockTimestamp,
      balanceAfter: 900,
    };

    expect(formatLedgerLabelFull(row)).toBe("Grant from admin · 'lol pay me back' +500");
  });

  it('formats without event name', () => {
    const row: LedgerRow = {
      uid: 'user1',
      amount: 100,
      type: 'refund',
      eventId: null,
      note: null,
      createdBy: 'system',
      createdAt: mockTimestamp,
      balanceAfter: 500,
    };

    expect(formatLedgerLabelFull(row)).toBe('Refund +100');
  });
});
