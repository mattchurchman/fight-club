import clsx from 'clsx';
import type { BoutFighterSnapshot } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { formatImpliedPct, formatOdds } from '../events/format.ts';

/** "Alexandre Pantoja" -> first "Alexandre", surname "Pantoja" (surname gets the display font). */
function splitName(name: string): { first: string; surname: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: '', surname: parts[0] ?? name };
  return { first: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] ?? name };
}

interface FighterPanelProps {
  fighter: BoutFighterSnapshot;
  odds: number | null;
  picked: boolean;
  dimmed: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

/** One tall fighter panel in a `FightSlide` (docs/tasks/T32, docs/DESIGN.md "Pick deck"). */
export function FighterPanel({
  fighter,
  odds,
  picked,
  dimmed,
  onSelect,
  disabled,
}: FighterPanelProps) {
  const { first, surname } = splitName(fighter.name);
  const implied = formatImpliedPct(odds);

  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={`Pick ${fighter.name}`}
      disabled={disabled}
      onClick={onSelect}
      className={clsx(
        'flex min-h-11 flex-1 flex-col items-center gap-2 rounded-card border p-3 text-center transition-opacity',
        picked ? 'border-text ring-2 ring-text' : 'border-line',
        dimmed && 'opacity-40',
        'disabled:cursor-not-allowed',
      )}
    >
      <Avatar name={fighter.name} src={fighter.headshotUrl ?? undefined} size={96} />
      <div className="flex flex-col items-center">
        {first ? <p className="text-xs text-muted">{first}</p> : null}
        <p className="font-display text-lg leading-tight text-text">{surname}</p>
        {picked ? (
          <span aria-hidden="true" className="mt-1 h-0.5 w-10 rounded-full bg-red" />
        ) : null}
      </div>
      <p className="text-xs text-muted">{fighter.record}</p>
      <p className="text-sm font-semibold tabular-nums text-text">{formatOdds(odds)}</p>
      {implied ? <p className="text-[11px] tabular-nums text-muted">{implied}</p> : null}
      {picked ? <p className="label text-win">✓ Your pick</p> : null}
    </button>
  );
}
