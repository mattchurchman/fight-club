import clsx from 'clsx';
import { BADGE_DEFINITIONS } from '@shared/badges.ts';
import { useToast } from '../../components/ui/Toast.tsx';

interface BadgesRowProps {
  earned: string[];
  /** Times each badge has been earned (`user.badgeCounts`). Falls back to 1 for ids in `earned`
   * when absent, so a legacy user with only the distinct list still reads as earned. */
  counts?: Record<string, number>;
}

const COUNT_CAP = 99;

/** All badges as octagon tiles: earned ones in `text`, unearned dimmed to `opacity-30` (the name
 * underneath stays fully readable either way), earned sorted before locked. Tap shows the
 * description (plus the count, when ≥2) in a toast. A count ≥2 shows a `×N` chip on the tile's
 * corner (docs/DESIGN.md "Archive & profiles"). */
export function BadgesRow({ earned, counts }: BadgesRowProps) {
  const { show: showToast } = useToast();
  const badges = Object.values(BADGE_DEFINITIONS);
  const countFor = (id: string): number => counts?.[id] ?? (earned.includes(id) ? 1 : 0);
  const sorted = [...badges].sort((a, b) => {
    const aEarned = countFor(a.id) >= 1 ? 0 : 1;
    const bEarned = countFor(b.id) >= 1 ? 0 : 1;
    return aEarned - bEarned;
  });

  return (
    <div className="flex flex-wrap gap-3 px-4">
      {sorted.map((badge) => {
        const count = countFor(badge.id);
        const isEarned = count >= 1;
        const cappedCount = Math.min(count, COUNT_CAP);
        return (
          <button
            key={badge.id}
            type="button"
            aria-label={count >= 2 ? `${badge.name}, earned ${cappedCount} times` : undefined}
            onClick={() =>
              showToast(
                `${badge.emoji} ${badge.name} — ${badge.description}${count >= 2 ? ` · ×${cappedCount}` : ''}`,
              )
            }
            className="relative flex min-h-11 w-16 flex-col items-center gap-1.5"
          >
            <span
              className={clsx(
                'octagon flex size-14 items-center justify-center bg-surface-2 text-2xl',
                isEarned ? 'text-text' : 'opacity-30',
              )}
              aria-hidden="true"
            >
              {badge.emoji}
            </span>
            {count >= 2 ? (
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-fill px-1 font-display text-[11px] text-white ring-2 ring-bg"
              >
                ×{cappedCount}
              </span>
            ) : null}
            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
              {badge.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
