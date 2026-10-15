import type { Method, Pick } from '@shared/index.ts';
import type { BoutWithId } from './hooks.ts';
import { formatOdds } from './format.ts';

const METHOD_LABEL: Record<Method, string> = { KO: 'KO', SUB: 'SUB', DEC: 'DEC' };

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

interface FightCardListProps {
  bouts: BoutWithId[];
  /** Draft or submitted picks, keyed by bout id; a row's summary only shows once a pick is complete. */
  picks?: Record<string, Partial<Pick>>;
  lockBoutId?: string | null;
  /** This entry's bout score, keyed by bout id; a row adds `+N`/`N` once its bout is final (docs/tasks/T33 §6). */
  scores?: Record<string, number | null>;
  readOnly: boolean;
  onSelect?: (boutId: string) => void;
}

/** Compact one-row-per-fight list; tapping a row opens the pick deck on that fight (docs/tasks/T31). */
export function FightCardList({
  bouts,
  picks,
  lockBoutId,
  scores,
  readOnly,
  onSelect,
}: FightCardListProps) {
  const mainCard = bouts.filter((bout) => bout.isMainCard);

  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {mainCard.map((bout) => {
        const pick = picks?.[bout.id];
        const complete =
          pick?.winner !== undefined && pick?.method !== undefined && typeof pick.stake === 'number';
        const winnerName = pick?.winner === 'A' ? bout.a.name : pick?.winner === 'B' ? bout.b.name : null;
        const score = scores?.[bout.id];

        const content = (
          <>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {bout.weightClass}
              </p>
              <p className="truncate text-sm font-semibold text-text">
                {bout.a.name} vs {bout.b.name}
              </p>
              {complete && winnerName ? (
                <p className="truncate text-xs text-muted">
                  ✓ {surname(winnerName)} · {METHOD_LABEL[pick!.method!]} · {pick!.stake}
                  {lockBoutId === bout.id ? ' · 🔒' : ''}
                  {score !== undefined && score !== null ? (
                    <>
                      {' · '}
                      <span className={score > 0 ? 'font-semibold text-win' : 'font-semibold'}>
                        {score > 0 ? `+${score}` : score} {score > 0 ? '✓' : '✗'}
                      </span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs font-semibold tabular-nums text-muted">
              <span>{formatOdds(bout.odds.a)}</span>
              <span>{formatOdds(bout.odds.b)}</span>
            </div>
          </>
        );

        if (readOnly || !onSelect) {
          return (
            <li key={bout.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
              {content}
            </li>
          );
        }

        return (
          <li key={bout.id}>
            <button
              type="button"
              onClick={() => onSelect(bout.id)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2"
            >
              {content}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
