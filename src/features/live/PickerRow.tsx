import clsx from 'clsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
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
      aria-label={`View ${info.name}'s picks`}
      className={clsx(
        'flex min-h-11 w-full items-center gap-1.5 rounded-chip px-2.5 text-left text-sm',
        info.isSelf ? 'bg-text text-bg' : 'bg-surface-2 text-text',
      )}
    >
      {info.name !== info.firstName ? <span className="sr-only">{info.name}</span> : null}
      <Avatar
        name={info.name}
        src={info.photoURL ?? undefined}
        size={24}
        className={info.isSelf ? 'bg-bg text-text' : undefined}
      />
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate font-medium">{info.firstName}</span>
          {info.isLock ? <span aria-label="Lock of the night">🔒</span> : null}
          {info.firstBlood ? (
            <span
              className="shrink-0"
              aria-label={
                info.firstBlood.sameAsWinner ? 'First blood' : `First blood: ${info.firstBlood.surname}`
              }
            >
              🩸{!info.firstBlood.sameAsWinner ? ` ${info.firstBlood.surname}` : ''}
            </span>
          ) : null}
        </span>
        {!compact ? (
          <span
            className={clsx(
              'text-xs tabular-nums',
              info.isSelf ? 'text-bg/70' : 'text-muted',
            )}
          >
            {info.method} · {info.stake}
          </span>
        ) : null}
      </span>
    </button>
  );
}
