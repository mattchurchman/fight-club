import clsx from 'clsx';
import type { Corner, FirstBloodPick } from '@shared/index.ts';
import { Button } from '../../components/ui/Button.tsx';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { DraftPick } from './draftReducer.ts';
import { isPickComplete } from './deckProgress.ts';
import { FirstBloodPicker } from './FirstBloodPicker.tsx';
import { stepStake } from './StakePicker.tsx';

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

interface ReviewRowProps {
  bout: BoutWithId;
  pick: DraftPick;
  isLock: boolean;
  readOnly: boolean;
  minStake: number;
  maxStake: number;
  stakeStep: number;
  onJump: () => void;
  onChangeStake: (stake: number) => void;
  onToggleLock: () => void;
}

function ReviewRow({
  bout,
  pick,
  isLock,
  readOnly,
  minStake,
  maxStake,
  stakeStep,
  onJump,
  onChangeStake,
  onToggleLock,
}: ReviewRowProps) {
  const complete = isPickComplete(pick);

  if (!complete) {
    return (
      <li>
        <button
          type="button"
          onClick={onJump}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left"
        >
          <span className="truncate text-sm font-semibold text-text">
            {bout.a.name} vs {bout.b.name}
          </span>
          <span className="shrink-0 text-sm text-muted">Not picked</span>
        </button>
      </li>
    );
  }

  const winnerName = pick.winner === 'A' ? bout.a.name : bout.b.name;
  const name = surname(winnerName);

  return (
    <li className="flex min-h-11 items-center gap-2 px-4 py-2">
      <button
        type="button"
        onClick={onJump}
        className="flex-1 truncate text-left font-display text-sm text-text"
      >
        {name}
      </button>
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
        {pick.method}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease stake for ${name}`}
          disabled={readOnly || pick.stake === undefined || pick.stake <= minStake}
          onClick={() => onChangeStake(stepStake(pick.stake, -stakeStep, minStake, maxStake))}
          className="flex size-8 items-center justify-center rounded-chip border border-line text-text transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-text">
          {pick.stake}
        </span>
        <button
          type="button"
          aria-label={`Increase stake for ${name}`}
          disabled={readOnly || pick.stake === undefined || pick.stake >= maxStake}
          onClick={() => onChangeStake(stepStake(pick.stake, stakeStep, minStake, maxStake))}
          className="flex size-8 items-center justify-center rounded-chip border border-line text-text transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
      <button
        type="button"
        aria-label={`Lock ${name}`}
        aria-pressed={isLock}
        disabled={readOnly}
        onClick={onToggleLock}
        className={clsx(
          'flex size-8 shrink-0 items-center justify-center rounded-chip border text-sm transition-colors disabled:cursor-not-allowed',
          isLock ? 'border-text bg-surface-2' : 'border-line opacity-50',
        )}
      >
        🔒
      </button>
    </li>
  );
}

interface ReviewSlideProps {
  bouts: BoutWithId[];
  picks: Record<string, DraftPick>;
  lockBoutId: string | null;
  readOnly: boolean;
  minStake: number;
  maxStake: number;
  stakeStep: number;
  onJumpToBout: (boutId: string) => void;
  onChangeStake: (boutId: string, stake: number) => void;
  onToggleLock: (boutId: string) => void;
  firstBloodEnabled: boolean;
  firstBlood: FirstBloodPick | null;
  firstBloodError?: string;
  onChangeFirstBlood: (boutId: string, fighter: Corner) => void;
  onAutoBalance: () => void;
  submitLabel: string;
  submitReady: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

/** The deck's last slide (docs/tasks/T33, docs/DESIGN.md "Pick deck" Review bullets). */
export function ReviewSlide({
  bouts,
  picks,
  lockBoutId,
  readOnly,
  minStake,
  maxStake,
  stakeStep,
  onJumpToBout,
  onChangeStake,
  onToggleLock,
  firstBloodEnabled,
  firstBlood,
  firstBloodError,
  onChangeFirstBlood,
  onAutoBalance,
  submitLabel,
  submitReady,
  submitting,
  onSubmit,
}: ReviewSlideProps) {
  return (
    <div className="flex flex-col gap-4">
      <SectionLabel>Your card</SectionLabel>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {bouts.map((bout) => (
          <ReviewRow
            key={bout.id}
            bout={bout}
            pick={picks[bout.id] ?? {}}
            isLock={lockBoutId === bout.id}
            readOnly={readOnly}
            minStake={minStake}
            maxStake={maxStake}
            stakeStep={stakeStep}
            onJump={() => onJumpToBout(bout.id)}
            onChangeStake={(stake) => onChangeStake(bout.id, stake)}
            onToggleLock={() => onToggleLock(bout.id)}
          />
        ))}
      </ul>

      {firstBloodEnabled ? (
        <FirstBloodPicker
          bouts={bouts}
          activeIds={bouts.map((bout) => bout.id)}
          value={firstBlood}
          readOnly={readOnly}
          errorMessage={firstBloodError}
          onChange={onChangeFirstBlood}
        />
      ) : null}

      {!readOnly ? (
        <div className="flex flex-col gap-3">
          <Button type="button" variant="secondary" onClick={onAutoBalance}>
            Auto-balance
          </Button>
          <Button
            type="button"
            aria-disabled={!submitReady}
            disabled={submitting}
            loading={submitting}
            onClick={onSubmit}
            className={!submitReady ? 'bg-steel text-muted' : undefined}
          >
            {submitLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
