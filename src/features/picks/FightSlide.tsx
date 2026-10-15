import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { Corner, Method } from '@shared/index.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { DraftPick } from './draftReducer.ts';
import { isPickComplete } from './deckProgress.ts';
import { FighterPanel } from './FighterPanel.tsx';
import { StakePicker } from './StakePicker.tsx';

const METHODS: readonly Method[] = ['KO', 'SUB', 'DEC'];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface FightSlideProps {
  bout: BoutWithId;
  pick: DraftPick;
  isLock: boolean;
  isLast: boolean;
  readOnly: boolean;
  attemptedSubmit: boolean;
  errorMessage?: string;
  preview: number | null;
  minStake: number;
  maxStake: number;
  stakeStep: number;
  onSelectWinner: (winner: Corner) => void;
  onSelectMethod: (method: Method) => void;
  onChangeStake: (stake: number) => void;
  onToggleLock: () => void;
  onNext: () => void;
}

/** One fight, full screen (docs/tasks/T32, docs/DESIGN.md "Pick deck"). */
export function FightSlide({
  bout,
  pick,
  isLock,
  isLast,
  readOnly,
  attemptedSubmit,
  errorMessage,
  preview,
  minStake,
  maxStake,
  stakeStep,
  onSelectWinner,
  onSelectMethod,
  onChangeStake,
  onToggleLock,
  onNext,
}: FightSlideProps) {
  const complete = isPickComplete(pick);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  function handleSelectMethod(method: Method) {
    const alreadyStaked = pick.winner !== undefined && typeof pick.stake === 'number';
    onSelectMethod(method);
    if (alreadyStaked && !prefersReducedMotion()) {
      autoAdvanceTimer.current = setTimeout(onNext, 400);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {bout.isMainEvent ? (
        <span className="self-center rounded-chip bg-red-fill px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
          Main event
        </span>
      ) : null}
      <p className="label text-center">
        {bout.weightClass} · {bout.rounds} Rounds
      </p>

      <div className="flex items-start gap-3">
        <FighterPanel
          fighter={bout.a}
          odds={bout.odds.a}
          picked={pick.winner === 'A'}
          dimmed={pick.winner === 'B'}
          onSelect={!readOnly ? () => onSelectWinner('A') : undefined}
          disabled={readOnly}
        />
        <FighterPanel
          fighter={bout.b}
          odds={bout.odds.b}
          picked={pick.winner === 'B'}
          dimmed={pick.winner === 'A'}
          onSelect={!readOnly ? () => onSelectWinner('B') : undefined}
          disabled={readOnly}
        />
      </div>

      <div className="flex justify-center gap-2">
        {METHODS.map((method) => (
          <Chip
            key={method}
            selected={pick.method === method}
            disabled={readOnly}
            onSelect={() => handleSelectMethod(method)}
          >
            {method}
          </Chip>
        ))}
      </div>

      <StakePicker
        value={pick.stake}
        min={minStake}
        max={maxStake}
        step={stakeStep}
        onChange={onChangeStake}
      />

      <button
        type="button"
        aria-pressed={isLock}
        disabled={readOnly}
        onClick={onToggleLock}
        className={clsx(
          'mx-auto flex min-h-11 items-center gap-1.5 rounded-chip border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
          isLock ? 'border-text bg-surface-2 text-text' : 'border-line text-muted',
        )}
      >
        🔒 Make this my lock
      </button>

      {preview !== null ? (
        <p className="text-center text-sm font-semibold tabular-nums text-win">
          If right +{preview} pts
        </p>
      ) : null}

      {attemptedSubmit && errorMessage ? (
        <p className="text-center text-xs font-medium text-red-text">{errorMessage}</p>
      ) : null}

      {complete ? (
        <Button type="button" onClick={onNext}>
          {isLast ? 'Review picks →' : 'Next fight →'}
        </Button>
      ) : null}
    </div>
  );
}
