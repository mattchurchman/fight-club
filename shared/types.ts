// Mirrors docs/DATA_MODEL.md. `Ts` lets shared/ stay free of the firebase dependency;
// the web app and jobs pass in their own Timestamp implementation.
export interface Timestamp {
  toMillis(): number;
}

export type Corner = 'A' | 'B';
export type Method = 'KO' | 'SUB' | 'DEC';
export type ResultMethod = 'KO' | 'SUB' | 'DEC' | 'DQ' | 'OTHER';
export type Winner = 'A' | 'B' | 'draw' | 'nc';
export type EventKind = 'numbered' | 'fightnight' | 'special';
export type EventStatus = 'scheduled' | 'open' | 'locked' | 'live' | 'final' | 'cancelled';
export type BoutStatus = 'scheduled' | 'live' | 'final' | 'cancelled';
export type OddsSource = 'espn' | 'oddsapi' | 'manual' | 'default';
export type EntryStatus = 'submitted' | 'void';
export type LedgerType = 'grant' | 'buyin' | 'payout' | 'refund' | 'adjust';
export type TokenRequestStatus = 'pending' | 'approved' | 'denied';
export type Role = 'player' | 'admin';

export interface MethodMultipliers {
  KO: number;
  SUB: number;
  DEC: number;
}

export interface AppDefaults {
  buyIn: number;
  startingGrant: number;
  budget: number;
  minStake: number;
  maxStake: number;
  stakeStep: number;
  methodMultipliers: MethodMultipliers;
  lockPenaltyPct: number;
  firstBloodBonus: number;
}

export interface AppConfig {
  admins: string[];
  seasonId: string;
  defaults: AppDefaults;
  autoEnableNumbered: boolean;
  rulesVersion: string;
}

export interface AllowlistEntry<Ts = Timestamp> {
  email: string;
  role: Role;
  startingGrant: number;
  invitedBy: string;
  invitedAt: Ts;
  claimedBy: string | null;
  claimedAt: Ts | null;
}

export interface UserStats {
  events: number;
  wins: number;
  podiums: number;
  points: number;
  correctWinners: number;
}

export interface User<Ts = Timestamp> {
  displayName: string;
  username: string;
  usernameLower: string;
  photoURL: string | null;
  email: string;
  role: Role;
  balance: number;
  createdAt: Ts;
  lastSeenAt: Ts;
  stats?: UserStats;
  badges?: string[];
}

export interface UsernameRecord {
  uid: string;
}

export interface UserDevice<Ts = Timestamp> {
  createdAt: Ts;
  platform: string;
}

export interface Fighter<Ts = Timestamp> {
  name: string;
  nickname: string | null;
  record: string;
  country: string | null;
  headshotUrl: string | null;
  espnId: string;
  updatedAt: Ts;
}

export interface Event<Ts = Timestamp> {
  name: string;
  subtitle: string | null;
  number: number | null;
  kind: EventKind;
  enabled: boolean;
  startsAt: Ts;
  lockAt: Ts;
  status: EventStatus;
  buyIn: number;
  budget: number;
  firstBloodEnabled: boolean;
  mainCardBoutIds: string[];
  paidEntrants: number;
  pot: number;
  venue: string | null;
  source: 'espn';
  espnId: string;
  updatedAt: Ts;
  finalizedAt: Ts | null;
  rulesVersion: string;
}

export interface BoutFighterSnapshot {
  fighterId: string;
  name: string;
  record: string;
  headshotUrl: string | null;
}

export interface BoutOdds<Ts = Timestamp> {
  a: number | null;
  b: number | null;
  source: OddsSource;
  updatedAt: Ts;
  frozen: boolean;
}

export interface BoutResult<Ts = Timestamp> {
  winner: Winner;
  method: ResultMethod;
  round: number | null;
  time: string | null;
  firstBlood: 'A' | 'B' | 'none' | null;
  source: 'espn' | 'manual';
  updatedAt: Ts;
}

export interface Bout<Ts = Timestamp> {
  order: number;
  weightClass: string;
  rounds: 3 | 5;
  isMainEvent: boolean;
  isMainCard: boolean;
  a: BoutFighterSnapshot;
  b: BoutFighterSnapshot;
  odds: BoutOdds<Ts>;
  status: BoutStatus;
  result: BoutResult<Ts> | null;
}

export interface Pick {
  winner: Corner;
  method: Method;
  stake: number;
}

export interface FirstBloodPick {
  boutId: string;
  fighter: Corner;
}

export interface BoutScore {
  base: number;
  method: number;
  lock: number;
  total: number;
}

export interface EntryScore {
  total: number;
  byBout: Record<string, BoutScore | null>;
  firstBlood: number;
  correctWinners: number;
  correctMethods: number;
}

export interface Entry<Ts = Timestamp> {
  uid: string;
  displayName: string;
  photoURL: string | null;
  picks: Record<string, Pick>;
  lockBoutId: string;
  firstBlood: FirstBloodPick | null;
  status: EntryStatus;
  submittedAt: Ts;
  updatedAt: Ts;
  charged: boolean;
  score: EntryScore | null;
  rank: number | null;
  payout: number | null;
}

export interface Comment<Ts = Timestamp> {
  uid: string;
  displayName: string;
  boutId: string | null;
  text: string;
  emoji: string | null;
  createdAt: Ts;
}

export interface LedgerRow<Ts = Timestamp> {
  uid: string;
  amount: number;
  type: LedgerType;
  eventId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: Ts;
  balanceAfter: number;
}

export interface TokenRequest<Ts = Timestamp> {
  uid: string;
  displayName: string;
  amount: number;
  note: string | null;
  status: TokenRequestStatus;
  createdAt: Ts;
  resolvedBy: string | null;
  resolvedAt: Ts | null;
}

export interface Standing<Ts = Timestamp> {
  uid: string;
  displayName: string;
  points: number;
  events: number;
  wins: number;
  podiums: number;
  netTokens: number;
  correctWinners: number;
  upsets: number;
  updatedAt: Ts;
}

export interface HeadToHead<Ts = Timestamp> {
  a: string;
  b: string;
  aWins: number;
  bWins: number;
  ties: number;
  updatedAt: Ts;
}

export interface JobRun<Ts = Timestamp> {
  lastRunAt: Ts;
  ok: boolean;
  summary: string;
  error: string | null;
}
