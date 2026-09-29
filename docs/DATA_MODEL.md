# Firestore data model — contract

The TypeScript source of truth is `shared/types.ts` (created in T03), which must match this file.
Timestamps are Firestore `Timestamp` (typed as `Timestamp` in shared, converted at the edges).
IDs: `evt_<espnEventId>`, `bout_<espnCompetitionId>`, `ftr_<espnAthleteId>`. Emails in doc IDs are lower-cased.
"W:" lists who may write: **J** = jobs (Admin SDK), **Adm** = admin user via rules, **Own** = the owning player.

## `config/app`  (W: Adm, J)
```
admins: string[]                 // uids; bootstrap by hand (SETUP.md)
seasonId: string                 // "2026"
defaults: { buyIn: 100, startingGrant: 500, budget: 1000, minStake: 50, maxStake: 400, stakeStep: 25,
            methodMultipliers: {KO:0.75, SUB:1, DEC:0.5}, lockPenaltyPct: 0.5, firstBloodBonus: 100 }
autoEnableNumbered: true         // numbered events auto-enabled on import
rulesVersion: "v2.0"
```

## `allowlist/{emailLower}`  (W: Adm; read: the signed-in user whose email matches, Adm)
`{ email, role: 'player'|'admin', startingGrant: number, invitedBy: uid, invitedAt, claimedBy: uid|null, claimedAt|null }`

## `users/{uid}`  (create: Own, only if allowlisted; update: Own for profile fields only; W balance/role/stats: Adm, J)
```
displayName, username, usernameLower, photoURL|null, email, role: 'player'|'admin',
balance: number (tokens), createdAt, lastSeenAt,
stats?: { events, wins, podiums, points, correctWinners }   // lifetime; written at finalize
badges?: string[]
```
`usernames/{usernameLower}` → `{ uid }` for uniqueness (create: Own, in the same batch as the user doc).
`users/{uid}/devices/{fcmToken}` → `{ createdAt, platform }` (W: Own) (T24).

## `fighters/{ftr_id}`  (W: J, Adm; read: signed-in)
`{ name, nickname|null, record: "W-L-D", country|null, headshotUrl|null, espnId, updatedAt }`

## `events/{evt_id}`  (W: J, Adm; read: signed-in)
```
name: "UFC 320", subtitle: "Ankalaev vs. Pereira 2", number: 320|null,
kind: 'numbered'|'fightnight'|'special', enabled: boolean,   // 'special' = neither numbered nor Fight Night
                                                            // (Noche UFC, UFC Freedom 250). Scored as
                                                            // fightnight; never auto-enabled.
startsAt, lockAt,                     // lockAt = main-card start (see DATA_SOURCES.md)
status: 'scheduled'|'open'|'locked'|'live'|'final'|'cancelled',
buyIn: number, budget: number, firstBloodEnabled: boolean,
mainCardBoutIds: string[] (ordered, main event first),
paidEntrants: number, pot: number,    // set at lock
venue|null, source: 'espn', espnId, updatedAt, finalizedAt|null, rulesVersion
```
Status flow: `scheduled` (imported, not enabled) → `open` (enabled, now < lockAt) → `locked` (job charged buy-ins)
→ `live` (first result) → `final` (finalized + paid). Any status can go to `cancelled`.

### `events/{evt_id}/bouts/{bout_id}`  (W: J, Adm; read: signed-in)
```
order: number (1 = main event), weightClass, rounds: 3|5, isMainEvent, isMainCard,
a: { fighterId, name, record, headshotUrl|null }, b: { ... },   // denormalized snapshot
odds: { a: number|null, b: number|null, source: 'espn'|'oddsapi'|'manual'|'default', updatedAt, frozen: boolean },
status: 'scheduled'|'live'|'final'|'cancelled',
result: null | { winner: 'A'|'B'|'draw'|'nc', method: 'KO'|'SUB'|'DEC'|'DQ'|'OTHER', round|null, time|null,
                 firstBlood: 'A'|'B'|'none'|null, source: 'espn'|'manual', updatedAt }
```

### `events/{evt_id}/entries/{uid}`  (W: Own while `request.time < lockAt` and status 'open', picks fields only; score fields: J, Adm)
(read: Own always; everyone signed-in once event status ∈ locked|live|final)
```
uid, displayName, photoURL|null,
picks: { [boutId]: { winner: 'A'|'B', method: 'KO'|'SUB'|'DEC', stake: number } },
lockBoutId: string, firstBlood: { boutId, fighter: 'A'|'B' } | null,
status: 'submitted'|'void', submittedAt, updatedAt,
charged: boolean,                                   // J at lock
score: null | { total, byBout: { [boutId]: { base, method, lock, total } | null }, firstBlood, correctWinners, correctMethods },
rank: number|null, payout: number|null
```

### `events/{evt_id}/comments/{autoId}`  (T25) (create: signed-in, own uid; delete: Own or Adm)
`{ uid, displayName, boutId|null, text (≤280), emoji|null, createdAt }`

## `ledger/{autoId}`  (W: J, Adm — never Own; read: Own rows, Adm all). Append-only; never update or delete.
`{ uid, amount: number (+/-), type: 'grant'|'buyin'|'payout'|'refund'|'adjust', eventId|null, note|null, createdBy: uid|'system', createdAt, balanceAfter }`
Every write to `users.balance` happens in the **same transaction** as its ledger row.

## `tokenRequests/{autoId}`  (create: Own with status 'pending'; update: Adm; read: Own, Adm)
`{ uid, displayName, amount (1..1000), note|null, status: 'pending'|'approved'|'denied', createdAt, resolvedBy|null, resolvedAt|null }`

## `seasons/{seasonId}/standings/{uid}`  (W: J, Adm; read: signed-in)
`{ uid, displayName, points, events, wins, podiums, netTokens, correctWinners, upsets, updatedAt }`

## `h2h/{uidA__uidB}` (uids sorted)  (W: J, Adm; read: signed-in) (T21)
`{ a, b, aWins, bWins, ties, updatedAt }`

## `jobRuns/{jobName}`  (W: J; read: Adm)
`{ lastRunAt, ok: boolean, summary: string, error|null }`

## Indexes (firestore.indexes.json)
- `ledger`: uid asc, createdAt desc
- `tokenRequests`: status asc, createdAt desc; uid asc, createdAt desc
- `events`: enabled asc, startsAt asc
- `seasons/*/standings`: points desc
