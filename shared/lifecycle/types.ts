import type { Bout, Entry, EventStatus, LedgerType, UserStats } from '../types.ts';

// The views the lifecycle planners read, and the write intents they return (docs/tasks/T09).
//
// Planners are pure and must not depend on `firebase`, so every timestamp crossing this boundary is
// epoch milliseconds. `jobs/lifecycle.ts` converts on the way in and out; `shared/scoring.ts`,
// `payouts.ts` and `standings.ts` are all generic over the timestamp type, so `Bout<Millis>` and
// `Entry<Millis>` drop straight into them.

/** Epoch milliseconds. */
export type Millis = number;

export type LifecycleBout = Bout<Millis>;
export type LifecycleEntry = Entry<Millis>;

/** The event fields the lifecycle reads. An `Event` with millisecond timestamps satisfies it. */
export interface LifecycleEvent {
  id: string;
  status: EventStatus;
  lockAt: Millis;
  buyIn: number;
  budget: number;
  firstBloodEnabled: boolean;
  paidEntrants: number;
  pot: number;
  finalizedAt: Millis | null;
}

/** The player fields the lifecycle reads: the balance gates the buy-in, the stats accumulate at finalize. */
export interface LifecycleUser {
  uid: string;
  displayName: string;
  balance: number;
  stats?: UserStats;
  lockStreak?: number;
  badges?: string[];
}

/**
 * A requested token movement. The planner never sees a balance, so it cannot compute `balanceAfter`;
 * `jobs/lib/ledger.ts` reads the balance inside a transaction and applies `planLedgerRow`.
 */
export interface LedgerIntent {
  uid: string;
  /** Signed: negative for a buy-in, positive for a payout or refund. */
  amount: number;
  type: LedgerType;
  eventId: string;
  note: string | null;
}

/** The subset of `events/{id}` a plan asks to change. Absent keys are left alone. */
export interface EventPatch {
  status?: EventStatus;
  paidEntrants?: number;
  pot?: number;
  finalizedAt?: Millis;
}

/** Every plan says whether it wants to do anything, and why not when it doesn't. */
export interface Plan {
  applies: boolean;
  reason: string | null;
}
