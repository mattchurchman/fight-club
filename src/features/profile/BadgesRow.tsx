import clsx from 'clsx';
import { BADGE_DEFINITIONS } from '@shared/badges.ts';
import { useToast } from '../../components/ui/Toast.tsx';

interface BadgesRowProps {
  earned: string[];
}

/** All badges as octagon tiles: earned ones in `text`, unearned dimmed to `opacity-30` (the name
 * underneath stays fully readable either way). Tap shows the description in a toast. */
export function BadgesRow({ earned }: BadgesRowProps) {
  const { show: showToast } = useToast();
  const badges = Object.values(BADGE_DEFINITIONS);

  return (
    <div className="flex flex-wrap gap-3 px-4">
      {badges.map((badge) => {
        const isEarned = earned.includes(badge.id);
        return (
          <button
            key={badge.id}
            type="button"
            onClick={() => showToast(`${badge.emoji} ${badge.name} — ${badge.description}`)}
            className="flex min-h-11 w-16 flex-col items-center gap-1.5"
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
            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
              {badge.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
