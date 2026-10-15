import type { ResultMethod } from '@shared/index.ts';
import { SectionLabel } from '../../components/ui/SectionLabel.tsx';
import type { ResultFeedRow } from './derive.ts';

const METHOD_ABBR: Record<ResultMethod, string> = {
  KO: 'KO',
  SUB: 'Sub',
  DEC: 'Dec',
  DQ: 'DQ',
  OTHER: 'Other',
};

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

interface ResultsListProps {
  feed: readonly ResultFeedRow[];
}

/** Finished main-card fights, newest first (docs/tasks/T37, docs/DESIGN.md "Live tab"). */
export function ResultsList({ feed }: ResultsListProps) {
  if (feed.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 px-4">
      <SectionLabel>Results</SectionLabel>
      <div className="flex flex-col gap-2">
        {feed.map((row) => {
          const decisive = row.loserName !== null;
          const title = decisive ? `${surname(row.winnerName)} def. ${surname(row.loserName!)}` : row.winnerName;

          const base = [METHOD_ABBR[row.method]];
          if (row.round != null) base.push(`R${row.round}`);
          if (decisive) base.push(`${row.pickedWinner} of ${row.total} had ${surname(row.winnerName)}`);
          const you = row.selfDelta != null ? `you ${row.selfDelta >= 0 ? '+' : ''}${row.selfDelta}` : null;

          return (
            <div key={row.boutId} className="flex flex-col gap-0.5 border-b border-line pb-2 text-sm">
              <p className="font-display uppercase text-text">{title}</p>
              <p className="text-xs text-muted">
                {base.join(' · ')}
                {you ? (
                  <>
                    {' · '}
                    <span className={row.selfDelta! > 0 ? 'text-win' : undefined}>{you}</span>
                  </>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
