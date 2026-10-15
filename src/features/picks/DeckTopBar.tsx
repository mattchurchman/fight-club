import clsx from 'clsx';
import { Link } from 'react-router-dom';

interface DeckTopBarProps {
  eventId: string;
  activeIndex: number;
  fightsCount: number;
  /** One entry per fight slide, true once that fight's pick is complete. */
  fightComplete: boolean[];
  allocated: number;
  budget: number;
}

/** Slim strip replacing the header/tab bar inside the pick deck (docs/DESIGN.md "Pick deck"). */
export function DeckTopBar({
  eventId,
  activeIndex,
  fightsCount,
  fightComplete,
  allocated,
  budget,
}: DeckTopBarProps) {
  const onReview = activeIndex >= fightsCount;
  const reviewComplete = fightComplete.every(Boolean);
  const atBudget = allocated === budget;

  return (
    <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/event/${eventId}`}
          aria-label="Close picks"
          className="flex size-11 items-center justify-center text-xl text-text"
        >
          ✕
        </Link>
        <p className="text-sm font-semibold uppercase tracking-wide text-text">
          {onReview ? 'Review' : `Fight ${activeIndex + 1} / ${fightsCount}`}
        </p>
        <span
          className={clsx(
            'min-w-11 text-right text-sm font-semibold tabular-nums',
            atBudget ? 'text-gold' : 'text-text',
          )}
        >
          {allocated} / {budget}
          {atBudget ? ' ✓' : ''}
        </span>
      </div>
      <div className="flex gap-1" role="presentation">
        {fightComplete.map((complete, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={clsx('h-1 flex-1 rounded-full', complete ? 'bg-gold' : 'bg-surface-2')}
          />
        ))}
        <span
          aria-hidden="true"
          className={clsx('h-1 flex-1 rounded-full', reviewComplete ? 'bg-gold' : 'bg-surface-2')}
        />
      </div>
    </div>
  );
}
