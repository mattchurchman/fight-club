import { useState } from 'react';
import clsx from 'clsx';
import { Avatar } from '../../components/ui/Avatar.tsx';
import { Card } from '../../components/ui/Card.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { CommentWithId, EntryWithId } from './hooks.ts';
import { PlayerSheet } from './PlayerSheet.tsx';
import { ReactionChips } from './ReactionChips.tsx';
import { computeConsensus, contrarianLabel, findContrarian } from './reveal.ts';

interface PickerColumnProps {
  corner: 'red' | 'blue';
  boutId: string;
  pickers: EntryWithId[];
  onTap: (uid: string) => void;
}

function PickerColumn({ corner, boutId, pickers, onTap }: PickerColumnProps) {
  if (pickers.length === 0) {
    return <div className="flex-1" />;
  }
  return (
    <div className={clsx('flex flex-1 flex-wrap gap-1.5', corner === 'red' ? 'justify-end' : 'justify-start')}>
      {pickers.map((entry) => (
        <button
          key={entry.uid}
          type="button"
          onClick={() => onTap(entry.uid)}
          aria-label={`${entry.displayName}'s pick`}
          className="relative flex min-h-11 min-w-11 items-center justify-center"
        >
          <Avatar name={entry.displayName} src={entry.photoURL ?? undefined} corner={corner} size={40} />
          {entry.lockBoutId === boutId ? (
            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 text-xs">
              🔒
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

interface RevealGridProps {
  bouts: BoutWithId[];
  entries: EntryWithId[];
  comments?: CommentWithId[] | undefined;
}

/** Everyone's picks, one row per main-card bout, once the event locks (docs/tasks/T15). */
export function RevealGrid({ bouts, entries, comments }: RevealGridProps) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const openEntry = entries.find((entry) => entry.uid === openUid) ?? null;

  return (
    <>
      <div className="flex flex-col gap-3">
        {bouts.map((bout) => {
          const consensus = computeConsensus(entries, bout.id);
          const contrarian = findContrarian(entries, bout.id);
          const aPickers = entries.filter((entry) => entry.picks[bout.id]?.winner === 'A');
          const bPickers = entries.filter((entry) => entry.picks[bout.id]?.winner === 'B');

          return (
            <Card key={bout.id} className="flex flex-col gap-2">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                {bout.a.name} <span className="text-line">vs</span> {bout.b.name}
              </p>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="bg-red" style={{ width: `${consensus.aPct}%` }} />
                <div className="bg-blue" style={{ width: `${consensus.bPct}%` }} />
              </div>
              <p className="sr-only">
                {consensus.aPct}% picked {bout.a.name}, {consensus.bPct}% picked {bout.b.name}
              </p>
              <div className="flex items-start gap-2">
                <PickerColumn corner="red" boutId={bout.id} pickers={aPickers} onTap={setOpenUid} />
                <PickerColumn corner="blue" boutId={bout.id} pickers={bPickers} onTap={setOpenUid} />
              </div>
              {contrarian ? (
                <p className="text-center text-xs font-semibold text-gold">
                  {contrarianLabel(contrarian, bout)}
                </p>
              ) : null}
              {comments && <ReactionChips boutId={bout.id} comments={comments} />}
            </Card>
          );
        })}
      </div>
      <PlayerSheet
        entry={openEntry}
        bouts={bouts}
        open={openEntry != null}
        onClose={() => setOpenUid(null)}
      />
    </>
  );
}
