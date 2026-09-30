import { DEFAULTS } from '../constants.ts';
import { DEFAULT_AMERICAN_ODDS } from '../scoring.ts';
import { mainCardBoutIds, validateEntry } from '../validation.ts';
import type { AppDefaults, OddsSource } from '../types.ts';
import type {
  EventPatch,
  LedgerIntent,
  LifecycleBout,
  LifecycleEntry,
  LifecycleEvent,
  LifecycleUser,
  Millis,
  Plan,
} from './types.ts';

// docs/GAME_RULES.md §2 and §4: at lockAt the job charges the buy-ins and freezes the prices the
// event will be scored on. Pure — `jobs/lifecycle.ts` applies the result.

/** docs/GAME_RULES.md §2: an entry that doesn't validate, or can't pay, is voided rather than charged. */
export type VoidReason = 'invalid' | 'insufficient-balance';

export interface VoidedEntry {
  uid: string;
  reason: VoidReason;
  /** Human-readable, for the job log: validation codes, or the balance that fell short. */
  detail: string;
}

/** The price a bout is scored on, frozen for good. */
export interface FrozenOdds {
  boutId: string;
  a: number;
  b: number;
  source: OddsSource;
}

export interface LockPlan extends Plan {
  reason: 'not-open' | 'before-lock' | null;
  /** uids charged by *this* run — entries already `charged` are counted but not re-charged. */
  charged: string[];
  voided: VoidedEntry[];
  ledger: LedgerIntent[];
  odds: FrozenOdds[];
  event: EventPatch;
}

function idle(reason: 'not-open' | 'before-lock'): LockPlan {
  return {
    applies: false,
    reason,
    charged: [],
    voided: [],
    ledger: [],
    odds: [],
    event: {},
  };
}

/**
 * docs/GAME_RULES.md §4: a bout with no complete price at lock is scored as even money, and says so
 * through `source: 'default'`. One missing side means neither price is trustworthy, so both default —
 * scoring a real price against a made-up one would quietly skew the pot.
 */
function freeze(bout: LifecycleBout, boutId: string): FrozenOdds {
  const { a, b, source } = bout.odds;
  if (a === null || b === null) {
    return { boutId, a: DEFAULT_AMERICAN_ODDS, b: DEFAULT_AMERICAN_ODDS, source: 'default' };
  }
  return { boutId, a, b, source };
}

/**
 * Closes entry: validates every submitted entry, charges the buy-ins that can be paid, voids the rest,
 * freezes the odds and moves the event to `locked`.
 *
 * Idempotent in two layers: it only fires while the event is still `open`, and an entry already marked
 * `charged` is counted towards the pot without a second ledger intent (whose id would be a no-op anyway).
 */
export function planLock(
  event: LifecycleEvent,
  bouts: Record<string, LifecycleBout>,
  entries: readonly LifecycleEntry[],
  users: Record<string, LifecycleUser>,
  now: Millis,
  cfg: AppDefaults = DEFAULTS,
): LockPlan {
  if (event.status !== 'open') {
    return idle('not-open');
  }
  if (now < event.lockAt) {
    return idle('before-lock');
  }

  const rules = { budget: event.budget, firstBloodEnabled: event.firstBloodEnabled };
  const charged: string[] = [];
  const voided: VoidedEntry[] = [];
  const ledger: LedgerIntent[] = [];
  let paidEntrants = 0;

  // Sorted so the plan (and therefore the job log) is stable across runs.
  for (const entry of [...entries].sort((a, b) => a.uid.localeCompare(b.uid))) {
    if (entry.status === 'void') {
      continue;
    }
    if (entry.charged) {
      paidEntrants += 1;
      continue;
    }

    const validation = validateEntry(entry, bouts, rules, cfg);
    if (!validation.ok) {
      voided.push({
        uid: entry.uid,
        reason: 'invalid',
        detail: validation.errors.map((error) => error.code).join(','),
      });
      continue;
    }

    // A missing user doc reads as a zero balance, so it voids instead of charging into the void.
    const balance = users[entry.uid]?.balance ?? 0;
    if (balance < event.buyIn) {
      voided.push({
        uid: entry.uid,
        reason: 'insufficient-balance',
        detail: `balance ${balance} < buyIn ${event.buyIn}`,
      });
      continue;
    }

    charged.push(entry.uid);
    ledger.push({
      uid: entry.uid,
      amount: -event.buyIn,
      type: 'buyin',
      eventId: event.id,
      note: null,
    });
    paidEntrants += 1;
  }

  const odds = mainCardBoutIds(bouts)
    .map((boutId) => ({ boutId, bout: bouts[boutId]! }))
    .filter(({ bout }) => !bout.odds.frozen)
    .map(({ boutId, bout }) => freeze(bout, boutId));

  return {
    applies: true,
    reason: null,
    charged,
    voided,
    ledger,
    odds,
    event: { status: 'locked', paidEntrants, pot: event.buyIn * paidEntrants },
  };
}
