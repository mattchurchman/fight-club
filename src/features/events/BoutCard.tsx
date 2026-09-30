import clsx from 'clsx';
import type { BoutFighterSnapshot, Corner, Method } from '@shared/index.ts';
import { DEFAULTS } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Card } from '../../components/ui/Card.tsx';
import { Chip } from '../../components/ui/Chip.tsx';
import { Stepper } from '../../components/ui/Stepper.tsx';
import type { BoutWithId } from './hooks.ts';
import {
  BOUT_STATUS_LABEL,
  drawOrNoContestLabel,
  formatImpliedPct,
  formatOdds,
  formatResultSummary,
} from './format.ts';

const METHODS: readonly Method[] = ['KO', 'SUB', 'DEC'];

interface FighterHalfProps {
  fighter: BoutFighterSnapshot;
  corner: 'red' | 'blue';
  odds: number | null;
  isWinner: boolean;
  faded: boolean;
  picked: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

function FighterHalf({
  fighter,
  corner,
  odds,
  isWinner,
  faded,
  picked,
  onSelect,
  disabled,
}: FighterHalfProps) {
  const implied = formatImpliedPct(odds);
  const highlighted = isWinner || picked;
  const className = clsx(
    'relative flex flex-1 flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-opacity',
    highlighted && 'bg-gold/10 ring-1 ring-gold',
    faded && 'opacity-50',
  );

  const content = (
    <>
      <Avatar
        name={fighter.name}
        src={fighter.headshotUrl ?? undefined}
        corner={corner}
        size={56}
      />
      <p className="line-clamp-2 text-sm font-semibold text-text">{fighter.name}</p>
      <p className="text-xs text-muted">{fighter.record}</p>
      <p
        className={clsx(
          'text-sm font-semibold tabular-nums',
          corner === 'red' ? 'text-red' : 'text-blue',
        )}
      >
        {formatOdds(odds)}
      </p>
      {implied ? <p className="text-[11px] tabular-nums text-muted">{implied}</p> : null}
      {picked ? (
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 text-sm font-bold text-gold">
          ✓
        </span>
      ) : null}
    </>
  );

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={`Pick ${fighter.name}`}
      disabled={disabled}
      onClick={onSelect}
      className={clsx(className, 'min-h-11 disabled:cursor-not-allowed')}
    >
      {content}
    </button>
  );
}

export interface BoutPickProps {
  winner: Corner | undefined;
  method: Method | undefined;
  stake: number | undefined;
  isLock: boolean;
  readOnly: boolean;
  /** "If right: +N pts" while the pick is still being built. */
  preview: number | null;
  /** This bout's actual score once the fight has a result. */
  scoreTotal: number | null;
  /** This bout's own validation error, if any. */
  errorMessage?: string;
  onSelectWinner: (winner: Corner) => void;
  onSelectMethod: (method: Method) => void;
  onChangeStake: (stake: number) => void;
  onToggleLock: () => void;
}

interface BoutCardProps {
  bout: BoutWithId;
  /** Present only for an active bout on an entry the viewer can build or review (docs/tasks/T14). */
  pick?: BoutPickProps;
}

export function BoutCard({ bout, pick }: BoutCardProps) {
  const { a, b, odds, result, status } = bout;
  const outcomeLabel = result ? drawOrNoContestLabel(result.winner) : null;

  return (
    <Card className={clsx(bout.isMainEvent && 'ring-1 ring-gold/60')}>
      <div className="flex flex-col gap-2">
        {bout.isMainEvent ? (
          <div className="self-center rounded-chip bg-gold px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bg">
            Main Event
          </div>
        ) : null}
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
          {bout.weightClass} · {bout.rounds} Rounds
        </p>
        <div className="flex items-start gap-2">
          <FighterHalf
            fighter={a}
            corner="red"
            odds={odds.a}
            isWinner={result?.winner === 'A'}
            faded={result != null && result.winner === 'B'}
            picked={pick?.winner === 'A'}
            onSelect={pick && !pick.readOnly ? () => pick.onSelectWinner('A') : undefined}
            disabled={pick?.readOnly}
          />
          <p className="pt-6 text-xs font-bold uppercase text-muted">vs</p>
          <FighterHalf
            fighter={b}
            corner="blue"
            odds={odds.b}
            isWinner={result?.winner === 'B'}
            faded={result != null && result.winner === 'A'}
            picked={pick?.winner === 'B'}
            onSelect={pick && !pick.readOnly ? () => pick.onSelectWinner('B') : undefined}
            disabled={pick?.readOnly}
          />
        </div>
        {status === 'live' ? (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-chip border border-loss/40 bg-loss/10 px-3 py-1 text-xs font-semibold text-loss">
              <span className="size-1.5 animate-pulse rounded-full bg-loss" aria-hidden="true" />
              Live
            </span>
          </div>
        ) : status === 'cancelled' ? (
          <div className="flex justify-center">
            <span className="rounded-chip border border-loss/40 bg-loss/10 px-3 py-1 text-xs font-semibold text-loss">
              {BOUT_STATUS_LABEL.cancelled}
            </span>
          </div>
        ) : result ? (
          <p className="text-center text-xs font-medium text-muted">
            {outcomeLabel ?? formatResultSummary(result)}
          </p>
        ) : null}

        {pick ? (
          <div className="flex flex-col gap-3 border-t border-line pt-3">
            <div className="flex justify-center gap-2">
              {METHODS.map((method) => (
                <Chip
                  key={method}
                  selected={pick.method === method}
                  disabled={pick.readOnly}
                  onSelect={() => pick.onSelectMethod(method)}
                >
                  {method}
                </Chip>
              ))}
            </div>

            {pick.readOnly ? (
              <p className="text-center text-sm font-semibold tabular-nums text-text">
                Staked {pick.stake ?? 0} pts
              </p>
            ) : (
              <Stepper
                className="items-center"
                value={pick.stake ?? DEFAULTS.minStake}
                min={DEFAULTS.minStake}
                max={DEFAULTS.maxStake}
                step={DEFAULTS.stakeStep}
                onChange={pick.onChangeStake}
              />
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                aria-pressed={pick.isLock}
                disabled={pick.readOnly}
                onClick={pick.onToggleLock}
                className={clsx(
                  'flex min-h-11 items-center gap-1.5 rounded-chip border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed',
                  pick.isLock ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted',
                )}
              >
                🔒 Lock
              </button>
              {pick.scoreTotal !== null ? (
                <p
                  className={clsx(
                    'text-sm font-semibold tabular-nums',
                    pick.scoreTotal >= 0 ? 'text-win' : 'text-loss',
                  )}
                >
                  {pick.scoreTotal >= 0 ? '+' : ''}
                  {pick.scoreTotal} pts
                </p>
              ) : pick.preview !== null ? (
                <p className="text-sm font-semibold tabular-nums text-win">
                  If right: +{pick.preview} pts
                </p>
              ) : null}
            </div>

            {pick.errorMessage ? (
              <p className="text-center text-xs font-medium text-loss">{pick.errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
