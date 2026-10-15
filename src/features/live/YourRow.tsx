import clsx from 'clsx';

interface YourRowProps {
  rank: number;
  points: number;
  /** Rank movement since the last result; positive = moved up (`rankMoves`, docs/tasks/T35). */
  move: number;
}

/** The viewer's own rank, always visible once they have an entry (docs/tasks/T36). */
export function YourRow({ rank, points, move }: YourRowProps) {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface px-4 py-2 text-sm">
      <p className="font-semibold text-text">You</p>
      <p className="text-muted">#{rank}</p>
      <p className={clsx('font-semibold tabular-nums', points >= 0 ? 'text-win' : 'text-muted')}>
        {points >= 0 ? '+' : ''}
        {points} pts
      </p>
      {move !== 0 ? (
        <p className={clsx('text-xs font-semibold', move > 0 ? 'text-win' : 'text-muted')}>
          {move > 0 ? `▲${move}` : `▼${Math.abs(move)}`}
        </p>
      ) : null}
    </div>
  );
}
