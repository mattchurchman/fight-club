import type { Corner } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import { formatOdds } from '../events/format.ts';
import type { SwingLine } from './derive.ts';
import type { EntryWithId } from './hooks.ts';

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

const ORDINAL_SUFFIX = ['th', 'st', 'nd', 'rd'] as const;

function ordinal(n: number): string {
  const v = n % 100;
  return `${n}${ORDINAL_SUFFIX[(v - 20) % 10] ?? ORDINAL_SUFFIX[v] ?? ORDINAL_SUFFIX[0]}`;
}

/** Your swing first, then any lead change, per docs/DESIGN.md "Live tab". `null` when neither applies. */
function swingClause(line: SwingLine): string | null {
  const parts: string[] = [];
  if (line.self) {
    parts.push(`you → ${ordinal(line.self.rank)} (${line.self.delta >= 0 ? '+' : ''}${line.self.delta})`);
  }
  if (line.newLeader) {
    parts.push(`${line.newLeader.name} takes 1st`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

interface InTheCageProps {
  bout: BoutWithId | null;
  entries: EntryWithId[];
  swing: SwingLine[];
  /** True once any main-card bout has a result; flips the heading from "Up next" to "In the cage". */
  hasResults: boolean;
  onTap: (uid: string) => void;
}

/** The current fight: fighters, who picked each side, and what's at stake (docs/tasks/T36). */
export function InTheCage({ bout, entries, swing, hasResults, onTap }: InTheCageProps) {
  if (!bout) return null;

  const sides: { corner: Corner; name: string; headshotUrl: string | null; odds: number | null }[] = [
    { corner: 'A', name: bout.a.name, headshotUrl: bout.a.headshotUrl, odds: bout.odds.a },
    { corner: 'B', name: bout.b.name, headshotUrl: bout.b.headshotUrl, odds: bout.odds.b },
  ];

  const lines = swing
    .map((line) => ({ line, clause: swingClause(line) }))
    .filter((row): row is { line: SwingLine; clause: string } => row.clause !== null);

  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
      <p className="label">{hasResults ? 'In the cage' : 'Up next'}</p>
      <div className="flex items-stretch justify-between gap-3">
        {sides.map((side) => {
          const pickers = entries.filter((entry) => entry.picks[bout.id]?.winner === side.corner);
          return (
            <div key={side.corner} className="flex flex-1 flex-col items-center gap-1.5">
              <Avatar name={side.name} src={side.headshotUrl ?? undefined} size={56} />
              <p className="font-display text-sm text-text">{surname(side.name)}</p>
              <p className="text-xs font-semibold tabular-nums text-muted">{formatOdds(side.odds)}</p>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {pickers.map((entry) => (
                  <button
                    key={entry.uid}
                    type="button"
                    onClick={() => onTap(entry.uid)}
                    className="relative"
                    aria-label={`View ${entry.displayName}'s picks`}
                  >
                    <Avatar name={entry.displayName} src={entry.photoURL ?? undefined} size={24} />
                    {entry.lockBoutId === bout.id ? (
                      <span aria-hidden="true" className="absolute -bottom-1 -right-1 text-[10px]">
                        🔒
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {lines.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">At least</p>
          {lines.map(({ line, clause }) => (
            <p key={line.side} className="text-xs text-text">
              If {surname(line.fighterName)} wins: {clause}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
