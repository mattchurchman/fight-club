import { useState } from 'react';
import clsx from 'clsx';
import type { ResultMethod, Winner } from '@shared/index.ts';
import { Button } from '../../../components/ui/Button.tsx';
import { Card } from '../../../components/ui/Card.tsx';
import { Chip } from '../../../components/ui/Chip.tsx';
import type { BoutWithId } from '../../events/hooks.ts';
import { BOUT_STATUS_LABEL, formatOdds, formatResultSummary } from '../../events/format.ts';
import type { ResultInput } from './eventWrites.ts';

const WINNERS: { value: Winner; label: string }[] = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'draw', label: 'Draw' },
  { value: 'nc', label: 'NC' },
];
const METHODS: readonly ResultMethod[] = ['KO', 'SUB', 'DEC', 'DQ', 'OTHER'];
const inputClass =
  'min-h-9 rounded-chip border border-line bg-surface-2 px-3 text-sm text-text placeholder-muted focus:border-gold focus:outline-none';

interface BoutRowProps {
  bout: BoutWithId;
  isFirstOnCard: boolean;
  isLastOnCard: boolean;
  canEditCard: boolean;
  canOverrideOdds: boolean;
  canEnterResult: boolean;
  busy: boolean;
  onMove: (direction: 'up' | 'down') => void;
  onToggleMainCard: () => void;
  onOverrideOdds: (a: number, b: number) => void;
  onSetResult: (input: ResultInput) => void;
}

export function BoutRow({
  bout,
  isFirstOnCard,
  isLastOnCard,
  canEditCard,
  canOverrideOdds,
  canEnterResult,
  busy,
  onMove,
  onToggleMainCard,
  onOverrideOdds,
  onSetResult,
}: BoutRowProps) {
  const [oddsA, setOddsA] = useState(bout.odds.a?.toString() ?? '');
  const [oddsB, setOddsB] = useState(bout.odds.b?.toString() ?? '');
  const [winner, setWinner] = useState<Winner>(bout.result?.winner ?? 'A');
  const [method, setMethod] = useState<ResultMethod>(bout.result?.method ?? 'DEC');
  const [round, setRound] = useState(bout.result?.round?.toString() ?? '');
  const [time, setTime] = useState(bout.result?.time ?? '');
  const [firstBlood, setFirstBlood] = useState<'A' | 'B' | 'none' | null>(bout.result?.firstBlood ?? null);
  const [oddsError, setOddsError] = useState('');

  const handleOddsSubmit = () => {
    const a = Number(oddsA);
    const b = Number(oddsB);
    if (!Number.isInteger(a) || a === 0 || !Number.isInteger(b) || b === 0) {
      setOddsError('Odds must be nonzero whole numbers, e.g. 150 or -200.');
      return;
    }
    setOddsError('');
    onOverrideOdds(a, b);
  };

  const handleResultSubmit = () => {
    onSetResult({
      winner,
      method,
      round: round.trim() === '' ? null : Math.max(1, Math.floor(Number(round))),
      time: time.trim() === '' ? null : time.trim(),
      firstBlood,
    });
  };

  return (
    <Card className={clsx('flex flex-col gap-3', bout.isMainEvent && 'ring-1 ring-gold/60')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">
            {bout.a.name} vs {bout.b.name}
          </p>
          <p className="text-xs text-muted">
            {bout.weightClass} · order {bout.order} · {bout.isMainCard ? 'main card' : 'prelim'}
          </p>
          <p className="text-xs text-muted">
            {formatOdds(bout.odds.a)} / {formatOdds(bout.odds.b)} ({bout.odds.source}) · {BOUT_STATUS_LABEL[bout.status]}
            {bout.result ? ` · ${formatResultSummary(bout.result)}` : ''}
          </p>
        </div>
        {canEditCard ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex gap-1">
              <Button
                variant="secondary"
                className="min-h-8 min-w-8 px-2 text-xs"
                disabled={busy || !bout.isMainCard || isFirstOnCard}
                onClick={() => onMove('up')}
                aria-label="Move up the card"
              >
                ▲
              </Button>
              <Button
                variant="secondary"
                className="min-h-8 min-w-8 px-2 text-xs"
                disabled={busy || !bout.isMainCard || isLastOnCard}
                onClick={() => onMove('down')}
                aria-label="Move down the card"
              >
                ▼
              </Button>
            </div>
            <Button
              variant={bout.isMainCard ? 'danger' : 'secondary'}
              className="min-h-8 px-2 text-xs"
              disabled={busy}
              onClick={onToggleMainCard}
            >
              {bout.isMainCard ? 'Remove from card' : 'Add to card'}
            </Button>
          </div>
        ) : null}
      </div>

      {canOverrideOdds ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor={`odds-a-${bout.id}`}>
                Odds A
              </label>
              <input
                id={`odds-a-${bout.id}`}
                type="number"
                value={oddsA}
                onChange={(e) => setOddsA(e.target.value)}
                className={clsx(inputClass, 'w-24')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase text-muted" htmlFor={`odds-b-${bout.id}`}>
                Odds B
              </label>
              <input
                id={`odds-b-${bout.id}`}
                type="number"
                value={oddsB}
                onChange={(e) => setOddsB(e.target.value)}
                className={clsx(inputClass, 'w-24')}
              />
            </div>
            <Button variant="secondary" className="min-h-9 px-3 text-xs" disabled={busy} onClick={handleOddsSubmit}>
              Set odds
            </Button>
          </div>
          {oddsError ? <p className="text-xs text-red">{oddsError}</p> : null}
        </div>
      ) : null}

      {canEnterResult ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap gap-1.5">
            {WINNERS.map((w) => (
              <Chip key={w.value} selected={winner === w.value} onSelect={() => setWinner(w.value)}>
                {w.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <Chip key={m} selected={method === m} onSelect={() => setMethod(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              placeholder="Round"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className={clsx(inputClass, 'w-20')}
            />
            <input
              type="text"
              placeholder="Time (1:34)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={clsx(inputClass, 'flex-1')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-muted">First blood</span>
            {(['A', 'B', 'none'] as const).map((fb) => (
              <Chip key={fb} selected={firstBlood === fb} onSelect={() => setFirstBlood(fb)}>
                {fb === 'none' ? 'None' : fb}
              </Chip>
            ))}
          </div>
          <Button className="min-h-9 self-start px-3 text-xs" disabled={busy} onClick={handleResultSubmit}>
            {bout.result ? 'Override result' : 'Enter result'}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
