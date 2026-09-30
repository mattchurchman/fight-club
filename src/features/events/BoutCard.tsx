import clsx from 'clsx';
import type { BoutFighterSnapshot } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Card } from '../../components/ui/Card.tsx';
import type { BoutWithId } from './hooks.ts';
import {
  BOUT_STATUS_LABEL,
  drawOrNoContestLabel,
  formatImpliedPct,
  formatOdds,
  formatResultSummary,
} from './format.ts';

interface FighterHalfProps {
  fighter: BoutFighterSnapshot;
  corner: 'red' | 'blue';
  odds: number | null;
  isWinner: boolean;
  faded: boolean;
}

function FighterHalf({ fighter, corner, odds, isWinner, faded }: FighterHalfProps) {
  const implied = formatImpliedPct(odds);
  return (
    <div
      className={clsx(
        'flex flex-1 flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-opacity',
        isWinner && 'bg-gold/10 ring-1 ring-gold',
        faded && 'opacity-50',
      )}
    >
      <Avatar name={fighter.name} src={fighter.headshotUrl ?? undefined} corner={corner} size={56} />
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
    </div>
  );
}

interface BoutCardProps {
  bout: BoutWithId;
}

/** Display mode only; T14 adds tap-to-pick, a stake stepper and a Lock-of-the-Night toggle. */
export function BoutCard({ bout }: BoutCardProps) {
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
          />
          <p className="pt-6 text-xs font-bold uppercase text-muted">vs</p>
          <FighterHalf
            fighter={b}
            corner="blue"
            odds={odds.b}
            isWinner={result?.winner === 'B'}
            faded={result != null && result.winner === 'A'}
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
      </div>
    </Card>
  );
}
