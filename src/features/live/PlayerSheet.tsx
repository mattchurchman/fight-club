import clsx from 'clsx';
import type { BoutScore } from '@shared/index.ts';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Sheet } from '../../components/ui/Sheet.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { EntryWithId } from './hooks.ts';
import { boutPickOutcome } from './reveal.ts';
import type { PickOutcome } from './reveal.ts';

const OUTCOME_ICON: Record<PickOutcome, string> = {
  correct: '✓',
  wrong: '✗',
  push: '↺',
  pending: '…',
};

function BreakdownLine({ score }: { score: BoutScore }) {
  const parts: string[] = [];
  if (score.base) parts.push(`base ${score.base >= 0 ? '+' : ''}${score.base}`);
  if (score.method) parts.push(`method +${score.method}`);
  if (score.lock) parts.push(`lock ${score.lock >= 0 ? '+' : ''}${score.lock}`);
  if (parts.length === 0) return null;
  return <p className="text-[11px] text-muted">{parts.join(' · ')}</p>;
}

interface PlayerSheetProps {
  entry: EntryWithId | null;
  bouts: BoutWithId[];
  open: boolean;
  onClose: () => void;
}

/** Tap-through detail sheet for one player's picks and scoring breakdown (docs/tasks/T15). */
export function PlayerSheet({ entry, bouts, open, onClose }: PlayerSheetProps) {
  if (!entry) return null;

  const firstBloodBout = entry.firstBlood
    ? bouts.find((bout) => bout.id === entry.firstBlood?.boutId)
    : undefined;

  return (
    <Sheet open={open} onClose={onClose} title={entry.displayName}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={entry.displayName} src={entry.photoURL ?? undefined} size={48} />
          {entry.score ? (
            <p
              className={clsx(
                'font-display text-xl tabular-nums',
                entry.score.total >= 0 ? 'text-win' : 'text-loss',
              )}
            >
              {entry.score.total >= 0 ? '+' : ''}
              {entry.score.total} pts
            </p>
          ) : (
            <p className="text-sm text-muted">Picks locked · not scored yet</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {bouts.map((bout) => {
            const pick = entry.picks[bout.id];
            if (!pick) return null;
            const outcome = boutPickOutcome(pick, bout);
            const boutScore = entry.score?.byBout[bout.id] ?? null;
            const fighterName = pick.winner === 'A' ? bout.a.name : bout.b.name;

            return (
              <div
                key={bout.id}
                className="flex items-center justify-between gap-2 border-b border-line pb-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'font-semibold',
                      outcome === 'correct' && 'text-win',
                      outcome === 'wrong' && 'text-loss',
                      outcome === 'push' && 'text-muted',
                    )}
                  >
                    {OUTCOME_ICON[outcome]}
                  </span>
                  {entry.lockBoutId === bout.id ? <span aria-hidden="true">🔒</span> : null}
                  <span className="truncate text-text">{fighterName}</span>
                  <span className="shrink-0 text-muted">· {pick.method}</span>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={clsx(
                      'text-sm font-semibold tabular-nums',
                      boutScore
                        ? boutScore.total >= 0
                          ? 'text-win'
                          : 'text-loss'
                        : 'text-muted',
                    )}
                  >
                    {boutScore ? `${boutScore.total >= 0 ? '+' : ''}${boutScore.total}` : `${pick.stake} pts`}
                  </p>
                  {boutScore ? <BreakdownLine score={boutScore} /> : null}
                </div>
              </div>
            );
          })}
        </div>

        {entry.firstBlood ? (
          <p className="text-xs text-muted">
            First blood:{' '}
            {firstBloodBout
              ? entry.firstBlood.fighter === 'A'
                ? firstBloodBout.a.name
                : firstBloodBout.b.name
              : '—'}
            {entry.score ? ` · ${entry.score.firstBlood >= 0 ? '+' : ''}${entry.score.firstBlood} pts` : ''}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
