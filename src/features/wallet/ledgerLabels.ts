import type { LedgerRow, LedgerType } from '@shared/index.ts';

const ledgerTypeLabels: Record<LedgerType, string> = {
  grant: 'Grant from admin',
  buyin: 'Buy-in',
  payout: 'Payout',
  refund: 'Refund',
  adjust: 'Adjustment',
};

export interface LedgerLabel {
  type: string;
  amount: string;
  note?: string;
}

export function formatLedgerLabel(row: LedgerRow): LedgerLabel {
  const typeLabel = ledgerTypeLabels[row.type];
  const amountStr = row.amount >= 0 ? `+${row.amount}` : `${row.amount}`;
  const noteStr = row.note ? ` · '${row.note}'` : '';

  return {
    type: typeLabel,
    amount: amountStr,
    note: noteStr || undefined,
  };
}

export function formatLedgerLabelFull(
  row: LedgerRow,
  eventName?: string,
): string {
  const { type, amount, note } = formatLedgerLabel(row);
  return `${type}${note || ''}${eventName ? ` · ${eventName}` : ''} ${amount}`;
}
