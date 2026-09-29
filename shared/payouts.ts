import { PAYOUT_TABLE } from './constants.ts';
import type { Ranked, ScoredEntry } from './scoring.ts';

// Implements docs/GAME_RULES.md §6. Pure: no clock, no I/O.

export interface Payout {
  uid: string;
  amount: number;
}

/**
 * The prize split for a field of `paidEntrants`, as fractions of the pot. Empty below two
 * entrants: a lone entrant is refunded (ledger `refund`), never paid.
 */
export function payoutTableFor(paidEntrants: number): readonly number[] {
  const row = PAYOUT_TABLE.find(({ min, max }) => paidEntrants >= min && paidEntrants <= max);
  return row ? row.splits : [];
}

/** Earliest `submittedAt` wins the flooring remainder; uid breaks a dead heat so the result is stable. */
function remainderGoesTo(members: readonly Ranked<ScoredEntry>[]): string {
  return members.reduce((earliest, member) => {
    const memberAt = member.submittedAt ?? Number.POSITIVE_INFINITY;
    const earliestAt = earliest.submittedAt ?? Number.POSITIVE_INFINITY;
    if (memberAt !== earliestAt) {
      return memberAt < earliestAt ? member : earliest;
    }
    return member.uid < earliest.uid ? member : earliest;
  }, members[0]!).uid;
}

/**
 * Splits the pot over `ranked` — which must hold only the entries actually charged at lock.
 * Entries sharing a rank pool every place they occupy and split it evenly. The sum of the
 * returned amounts always equals the pot (`buyIn × ranked.length`), except below two
 * entrants, where there is no payout at all.
 */
export function computePayouts(ranked: readonly Ranked<ScoredEntry>[], buyIn: number): Payout[] {
  const splits = payoutTableFor(ranked.length);
  const pot = buyIn * ranked.length;
  if (splits.length === 0 || pot <= 0) {
    return [];
  }

  const places = splits.map((pct) => Math.floor(pot * pct));
  const allocated = places.reduce((sum, amount) => sum + amount, 0);
  places[0] = places[0]! + (pot - allocated); // the flooring leftover goes to 1st place

  const byRank = new Map<number, Ranked<ScoredEntry>[]>();
  for (const entry of ranked) {
    const group = byRank.get(entry.rank);
    if (group) {
      group.push(entry);
    } else {
      byRank.set(entry.rank, [entry]);
    }
  }

  const payouts: Payout[] = [];
  for (const [rank, members] of byRank) {
    // Members of a shared rank occupy places rank..rank+n-1; places off the table are worth 0.
    const pool = members.reduce(
      (sum, _member, offset) => sum + (places[rank - 1 + offset] ?? 0),
      0,
    );
    if (pool <= 0) {
      continue;
    }
    const each = Math.floor(pool / members.length);
    const remainderUid = remainderGoesTo(members);
    for (const member of members) {
      const amount = each + (member.uid === remainderUid ? pool - each * members.length : 0);
      if (amount > 0) {
        payouts.push({ uid: member.uid, amount });
      }
    }
  }
  return payouts;
}
