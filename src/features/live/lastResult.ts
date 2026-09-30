import type { Bout, ResultMethod } from '@shared/index.ts';

// Pure "last result" banner logic (docs/tasks/T15).

/** Most recently finalized bout, by result.updatedAt. `null` when nothing has gone final yet. */
export function findLastFinalBout<Ts extends { toMillis(): number }>(
  bouts: readonly Bout<Ts>[],
): Bout<Ts> | null {
  let latest: Bout<Ts> | null = null;
  for (const bout of bouts) {
    if (bout.status !== 'final' || !bout.result) continue;
    if (!latest?.result || bout.result.updatedAt.toMillis() > latest.result.updatedAt.toMillis()) {
      latest = bout;
    }
  }
  return latest;
}

const METHOD_SHORT: Record<ResultMethod, string> = {
  KO: 'KO',
  SUB: 'SUB',
  DEC: 'DEC',
  DQ: 'DQ',
  OTHER: 'Other',
};

/** e.g. "Pereira def. Ankalaev — KO R2 4:12". `null` when the bout has no result yet. */
export function formatLastResult<Ts>(bout: Bout<Ts>): string | null {
  const { result } = bout;
  if (!result) return null;
  if (result.winner === 'draw') return `${bout.a.name} vs ${bout.b.name} — Draw`;
  if (result.winner === 'nc') return `${bout.a.name} vs ${bout.b.name} — No Contest`;

  const winner = result.winner === 'A' ? bout.a.name : bout.b.name;
  const loser = result.winner === 'A' ? bout.b.name : bout.a.name;
  const detail = [METHOD_SHORT[result.method], result.round != null ? `R${result.round}` : null, result.time]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  return detail ? `${winner} def. ${loser} — ${detail}` : `${winner} def. ${loser}`;
}
