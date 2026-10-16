import clsx from 'clsx';
import type { PickerInfo } from './pickers.ts';

interface PickerRowProps {
  info: PickerInfo;
  /** Name + markers only, no method/stake (used by In the Cage, docs/tasks/T47). */
  compact?: boolean;
  onTap: (uid: string) => void;
}

/** One picker's row under the fighter they took: name, markers, method · stake (docs/tasks/T46). */
export function PickerRow({ info, compact = false, onTap }: PickerRowProps) {
  return (
    <button
      type="button"
      onClick={() => onTap(info.uid)}
      className={clsx(
        'flex min-h-11 w-full items-center gap-1.5 rounded-chip px-2.5 text-left text-sm',
        info.isSelf ? 'bg-text text-bg' : 'bg-surface-2 text-text',
      )}
    >
      <span className="min-w-0 flex-1 truncate font-medium">{info.name}</span>
      {info.isLock ? <span aria-label="Lock of the night">🔒</span> : null}
      {info.firstBlood ? (
        <span
          aria-label={
            info.firstBlood.sameAsWinner ? 'First blood' : `First blood: ${info.firstBlood.surname}`
          }
        >
          🩸{!info.firstBlood.sameAsWinner ? ` ${info.firstBlood.surname}` : ''}
        </span>
      ) : null}
      {!compact ? (
        <span
          className={clsx(
            'shrink-0 tabular-nums',
            info.isSelf ? 'text-bg/70' : 'text-muted',
          )}
        >
          {info.method} · {info.stake}
        </span>
      ) : null}
    </button>
  );
}
