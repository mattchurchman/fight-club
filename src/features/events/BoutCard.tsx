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
  odds: number | null;
  isWinner: boolean;
  faded: boolean;
}

function FighterHalf({ fighter, odds, isWinner, faded }: FighterHalfProps) {
  const implied = formatImpliedPct(odds);
  const className = clsx(
    'relative flex flex-1 flex-col items-center gap-1.5 rounded-xl p-2 text-center transition-opacity',
    isWinner && 'ring-2 ring-text',
    faded && 'opacity-50',
  );

  return (
    <div className={className}>
      <Avatar name={fighter.name} src={fighter.headshotUrl ?? undefined} size={56} />
      <p className="line-clamp-2 text-sm font-semibold text-text">{fighter.name}</p>
      <p className="text-xs text-muted">{fighter.record}</p>
      <p className="text-sm font-semibold tabular-nums text-text">{formatOdds(odds)}</p>
      {implied ? <p className="text-[11px] tabular-nums text-muted">{implied}</p> : null}
    </div>
  );
}

interface BoutCardProps {
  bout: BoutWithId;
}

export function BoutCard({ bout }: BoutCardProps) {
  const { a, b, odds, result, status } = bout;
  const outcomeLabel = result ? drawOrNoContestLabel(result.winner) : null;

  return (
    <Card className={clsx(bout.isMainEvent && 'ring-1 ring-red/60')}>
      <div className="flex flex-col gap-2">
        {bout.isMainEvent ? (
          <div className="self-center rounded-chip bg-red-fill px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Main Event
          </div>
        ) : null}
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
          {bout.weightClass} · {bout.rounds} Rounds
        </p>
        <div className="flex items-start gap-2">
          <FighterHalf
            fighter={a}
            odds={odds.a}
            isWinner={result?.winner === 'A'}
            faded={result != null && result.winner === 'B'}
          />
          <p className="pt-6 text-xs font-bold uppercase text-muted">vs</p>
          <FighterHalf
            fighter={b}
            odds={odds.b}
            isWinner={result?.winner === 'B'}
            faded={result != null && result.winner === 'A'}
          />
        </div>
        {status === 'live' ? (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-chip border border-red-text/40 bg-red-text/10 px-3 py-1 text-xs font-semibold text-red-text">
              <span className="size-1.5 animate-pulse rounded-full bg-red-text" aria-hidden="true" />
              Live
            </span>
          </div>
        ) : status === 'cancelled' ? (
          <div className="flex justify-center">
            <span className="rounded-chip border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
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
