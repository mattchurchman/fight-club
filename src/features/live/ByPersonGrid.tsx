import { useState } from 'react';
import clsx from 'clsx';
import { Card } from '../../components/ui/Card.tsx';
import type { BoutWithId } from '../events/hooks.ts';
import type { EntryWithId } from './hooks.ts';
import { byPerson } from './pickers.ts';
import { PlayerSheet } from './PlayerSheet.tsx';

interface ByPersonGridProps {
  bouts: BoutWithId[];
  entries: EntryWithId[];
  selfUid: string | null;
  firstBloodEnabled: boolean;
}

/** "By person" toggle on Everyone's picks: one row per friend, F1…Fn across the card (docs/tasks/T47). */
export function ByPersonGrid({ bouts, entries, selfUid, firstBloodEnabled }: ByPersonGridProps) {
  const [openUid, setOpenUid] = useState<string | null>(null);
  const openEntry = entries.find((entry) => entry.uid === openUid) ?? null;
  const rows = byPerson(entries, bouts, selfUid, firstBloodEnabled);

  return (
    <>
      <Card className="overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface p-2" />
              {bouts.map((bout, i) => (
                <th key={bout.id} className="label min-w-11 px-2 py-2 text-center">
                  F{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.uid}>
                <td className="sticky left-0 z-10 p-0">
                  <button
                    type="button"
                    onClick={() => setOpenUid(row.uid)}
                    aria-label={`View ${row.name}'s picks`}
                    className={clsx(
                      'min-h-11 w-full max-w-28 truncate px-2 py-2 text-left font-medium',
                      row.isSelf ? 'bg-text text-bg' : 'bg-surface text-text',
                    )}
                  >
                    {row.name}
                  </button>
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={bouts[i]!.id}
                    className={clsx(
                      'min-h-11 px-2 py-2 text-center font-display text-[11px]',
                      row.isSelf ? 'bg-text text-bg' : null,
                    )}
                  >
                    {cell.surname ? (
                      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                        {cell.surname}
                        {cell.isLock ? <span aria-label="Lock of the night">🔒</span> : null}
                        {cell.firstBlood ? (
                          <span
                            aria-label={
                              cell.firstBlood.sameAsWinner
                                ? 'First blood'
                                : `First blood: ${cell.firstBlood.surname}`
                            }
                          >
                            🩸
                            {!cell.firstBlood.sameAsWinner ? ` ${cell.firstBlood.surname}` : ''}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className={row.isSelf ? 'text-bg/70' : 'text-muted'}>—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <PlayerSheet
        entry={openEntry}
        bouts={bouts}
        open={openEntry != null}
        onClose={() => setOpenUid(null)}
      />
    </>
  );
}
