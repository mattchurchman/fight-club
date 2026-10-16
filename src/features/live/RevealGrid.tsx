import { useState } from 'react';
import { Card } from '../../components/ui/Card.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { CommentWithId, EntryWithId } from './hooks.ts';
import { PickerRow } from './PickerRow.tsx';
import { pickersFor } from './pickers.ts';
import { PlayerSheet } from './PlayerSheet.tsx';
import { ReactionChips } from './ReactionChips.tsx';
import { computeConsensus, contrarianLabel, findContrarian } from './reveal.ts';

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

interface RevealGridProps {
  bouts: BoutWithId[];
  entries: EntryWithId[];
  selfUid: string | null;
  firstBloodEnabled: boolean;
  comments?: CommentWithId[] | undefined;
}

/** Everyone's picks, one card per main-card bout, once the event locks (docs/tasks/T15, T46). */
export function RevealGrid({ bouts, entries, selfUid, firstBloodEnabled, comments }: RevealGridProps) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const openEntry = entries.find((entry) => entry.uid === openUid) ?? null;

  return (
    <>
      <div className="flex flex-col gap-3">
        {bouts.map((bout) => {
          const consensus = computeConsensus(entries, bout.id);
          const contrarian = findContrarian(entries, bout.id);
          const pickers = pickersFor(entries, bout, selfUid, firstBloodEnabled);

          return (
            <Card key={bout.id} className="flex flex-col gap-2">
              <p className="label text-center">
                {bout.isMainEvent ? <span className="text-red-text">Main event</span> : null}
                {bout.isMainEvent ? ' / ' : null}
                {bout.weightClass}
              </p>
              <div className="flex items-baseline justify-between font-display text-sm text-text">
                <span className="min-w-0 truncate">
                  {surname(bout.a.name)} {consensus.aCount}
                </span>
                <span className="min-w-0 truncate">
                  {consensus.bCount} {surname(bout.b.name)}
                </span>
              </div>
              <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="bg-text" style={{ width: `${consensus.aPct}%` }} />
                <div className="bg-steel" style={{ width: `${consensus.bPct}%` }} />
              </div>
              <p className="sr-only">
                {consensus.aPct}% picked {bout.a.name}, {consensus.bPct}% picked {bout.b.name}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                <div className="flex flex-col gap-1.5">
                  {pickers.a.map((info) => (
                    <PickerRow key={info.uid} info={info} onTap={setOpenUid} />
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {pickers.b.map((info) => (
                    <PickerRow key={info.uid} info={info} onTap={setOpenUid} />
                  ))}
                </div>
              </div>
              {contrarian ? (
                <p className="text-center text-xs font-semibold text-text">
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
