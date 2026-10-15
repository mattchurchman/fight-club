import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { ResultMethod } from '@shared/index.ts';
import type { ResultFeedRow } from './derive.ts';

const METHOD_ABBR: Record<ResultMethod, string> = {
  KO: 'KO',
  SUB: 'Sub',
  DEC: 'Dec',
  DQ: 'DQ',
  OTHER: 'Other',
};

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

interface ResultFlashProps {
  row: ResultFeedRow;
  /** The viewer's rank after this result, and their movement since the previous result (0 = none). `null` = spectator, no entry. */
  self: { rank: number; move: number } | null;
  onDismiss: () => void;
}

/** Top overlay shown once when a result lands while the Live tab is open (docs/tasks/T38, docs/DESIGN.md "Live tab"). */
export function ResultFlash({ row, self, onDismiss }: ResultFlashProps) {
  const [slidIn, setSlidIn] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(raf);
  }, [row.boutId]);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [row.boutId, onDismiss]);

  const title =
    row.loserName !== null ? `${surname(row.winnerName)} def. ${surname(row.loserName)}` : row.winnerName;
  const subtitle = [METHOD_ABBR[row.method], row.round != null ? `R${row.round}` : null].filter(Boolean).join(' · ');

  const won = row.selfDelta != null && row.selfDelta > 0;

  return (
    <button
      type="button"
      role="status"
      onClick={onDismiss}
      style={{ top: 'calc(3.5rem + env(safe-area-inset-top))' }}
      className={clsx(
        'fixed inset-x-0 z-40 flex flex-col items-start gap-0.5 border-t-[3px] border-red bg-surface px-4 py-3 text-left shadow-lg',
        'transition-transform duration-200 motion-reduce:transition-none',
        slidIn ? 'translate-y-0' : '-translate-y-full',
      )}
    >
      <p className="font-display uppercase text-text">{title}</p>
      <p className="text-sm text-muted">{subtitle}</p>
      {self && row.selfDelta != null ? (
        <p className="text-sm font-semibold">
          <span className={won ? 'text-win' : 'text-muted'}>
            {row.selfDelta >= 0 ? '+' : ''}
            {row.selfDelta} {won ? '✓' : '✗'}
          </span>
          {self.move !== 0 ? (
            <span className={clsx('ml-2', self.move > 0 ? 'text-win' : 'text-loss')}>
              {self.move > 0 ? `▲${self.move}` : `▼${Math.abs(self.move)}`} to #{self.rank}
            </span>
          ) : null}
        </p>
      ) : null}
    </button>
  );
}
