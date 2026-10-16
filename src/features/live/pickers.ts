import type { Method } from '@shared/index.ts';
import type { BoutWithId } from '../events/hooks.ts';
import type { EntryWithId } from './hooks.ts';

function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

export interface PickerInfo {
  uid: string;
  name: string;
  isSelf: boolean;
  method: Method;
  stake: number;
  isLock: boolean;
  firstBlood: { sameAsWinner: boolean; surname: string } | null;
}

export interface PickersByCorner {
  a: PickerInfo[];
  b: PickerInfo[];
}

/** Sorts a column: self first, then stake desc, then name (docs/tasks/T46). */
function sortColumn(pickers: PickerInfo[]): PickerInfo[] {
  return pickers.sort((x, y) => {
    if (x.isSelf !== y.isSelf) return x.isSelf ? -1 : 1;
    if (x.stake !== y.stake) return y.stake - x.stake;
    return x.name.localeCompare(y.name);
  });
}

/**
 * Who picked each side of a bout, with lock/first-blood markers, for the "Everyone's picks"
 * reveal grid (docs/tasks/T46, docs/DESIGN.md "Everyone's picks"). Entries with no pick for
 * this bout are excluded.
 */
export function pickersFor(
  entries: readonly EntryWithId[],
  bout: BoutWithId,
  selfUid: string | null,
  firstBloodEnabled: boolean,
): PickersByCorner {
  const a: PickerInfo[] = [];
  const b: PickerInfo[] = [];

  for (const entry of entries) {
    const pick = entry.picks[bout.id];
    if (!pick) continue;

    const firstBloodPick =
      firstBloodEnabled && entry.firstBlood?.boutId === bout.id ? entry.firstBlood : null;
    const firstBlood = firstBloodPick
      ? {
          sameAsWinner: firstBloodPick.fighter === pick.winner,
          surname: surname(firstBloodPick.fighter === 'A' ? bout.a.name : bout.b.name),
        }
      : null;

    const info: PickerInfo = {
      uid: entry.uid,
      name: entry.displayName,
      isSelf: entry.uid === selfUid,
      method: pick.method,
      stake: pick.stake,
      isLock: entry.lockBoutId === bout.id,
      firstBlood,
    };

    (pick.winner === 'A' ? a : b).push(info);
  }

  return { a: sortColumn(a), b: sortColumn(b) };
}
