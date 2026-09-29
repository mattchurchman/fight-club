# Game rules — rules version `v2.0`

This is the **contract** for `shared/scoring.ts`, `shared/payouts.ts` and `shared/validation.ts`.
Every number below lives in `shared/constants.ts` (and may be overridden per event where noted).
All rounding is JavaScript `Math.round` applied to **non-negative** magnitudes, per component
(penalties are computed as a positive magnitude and then negated). Payout splits use `Math.floor`.

## 1. Two currencies (don't mix them up)
- **Tokens:** the persistent wallet balance. Granted by the admin, spent on buy-ins, won from pots. Integers.
  Never convertible to cash or prizes.
- **Play-points:** the per-event budget used to express picks. They reset every event. Score is measured in points.

## 2. Entering an event
- Event must be `enabled` and `status == 'open'`, and `now < lockAt`.
- Player must have `balance >= buyIn` (default **100** tokens; per-event override `event.buyIn`) when they
  submit. The buy-in is **charged at lock** by the lifecycle job (ledger `buyin`). If the balance is short at
  lock time, the entry becomes `void` (not charged, not scored).
- One entry per player per event. It can be edited freely until `lockAt`.

## 3. Building picks (validation — `shared/validation.ts`)
For every **active** main-card bout (status not `cancelled`) the entry must have:
- `winner`: `'A' | 'B'`
- `method`: `'KO' | 'SUB' | 'DEC'` (KO includes TKO)
- `stake`: integer play-points, **50 ≤ stake ≤ 400**, multiple of **25**

Entry-level:
- Sum of stakes over active bouts **== budget** (default **1000**).
  If `activeBouts × 400 < 1000`, budget = `activeBouts × 400`. If `activeBouts × 50 > 1000`, budget = `activeBouts × 50`.
- Exactly one `lockBoutId`, which must be an active bout in the entry.
- `firstBlood` is required only if `event.firstBloodEnabled`: `{ boutId, fighter: 'A'|'B' }`.
- A bout cancelled *after* an entry was submitted doesn't invalidate the entry (see 4.4).

## 4. Scoring one bout (`scoreBout`)
Let `dec(o)` convert American odds to decimal: `o > 0 → 1 + o/100`, `o < 0 → 1 + 100/|o|`.
Odds used are the **snapshot frozen at lock** (`bout.odds.a/b`). If odds are missing at lock, both sides are `+100`
and `bout.odds.source = 'default'`.

4.1 **Winner correct:** `base = round(stake × dec(oddsOfPickedFighter))` (includes the stake).
4.2 **Winner wrong:** `base = 0`.
4.3 **Method bonus** (only if winner correct AND method matches): `method = round(stake × M[method])`
    with `M = { KO: 0.75, SUB: 1.00, DEC: 0.50 }`. A result method of `DQ` or `OTHER` never matches.
4.4 **Draw, No Contest, or bout cancelled:** `base = stake`, no method bonus, no lock bonus or penalty (push).
4.5 **Lock of the Night** (only for `lockBoutId`):
    - winner correct → `lock = base` (the base is doubled; the method bonus isn't)
    - winner wrong → `lock = −round(stake × 0.5)`
4.6 **First Blood** (entry-level, only if enabled): if `bout.result.firstBlood === entry.firstBlood.fighter`
    for the chosen bout → `+100`. If the result is `'none'` or never entered by finalize → `0` (void). It's independent of the winner.

`boutTotal = base + method + lock`. `entryTotal = Σ boutTotal + firstBloodBonus`. Totals can be negative.
Bouts without a result yet score `null` (pending) and count as 0 in live totals.

## 5. Ranking
Sort by `entryTotal` desc. Tiebreakers: (1) more correct winners, (2) more correct methods.
Still tied means the same rank (shared).

## 6. Payouts (`shared/payouts.ts`)
- `pot = buyIn × paidEntrants` (entries charged at lock, not void).
- Split table by number of paid entrants: **1 → refund** (ledger `refund`, no winner); **2–3 → [100%]**;
  **4–6 → [70%, 30%]**; **7+ → [60%, 30%, 10%]**.
- Each place gets `floor(pot × pct)`. The leftover from flooring goes to 1st place.
- **Ties:** players sharing a rank pool the prizes for every place they occupy and split evenly (floor).
  The leftover goes to the tied player with the earliest `submittedAt`.
- **Event cancelled:** everyone charged gets a full `refund`.
- Payouts are written once, at finalize, as ledger `payout` rows. After that, corrections are manual `adjust` rows.

## 7. Worked examples (these MUST be unit tests)
| # | Situation | Result |
|---|---|---|
| E1 | stake 200 on +150, correct, method SUB correct, not lock | base 500, method 200 → **700** |
| E2 | stake 200 on −200, correct, method wrong | base 300 → **300** |
| E3 | same as E1 but it's the lock | 500 + 200 + 500 → **1200** |
| E4 | lock, stake 300, wrong | 0 + 0 − 150 → **−150** |
| E5 | stake 100, draw, lock | **100** (push) |
| E6 | stake 150 on −110, correct, KO correct | base round(150×1.909..)=286, method 113 → **399** |
| E7 | pot 5 players × 100 = 500 | [350, 150] |
| E8 | 8 players × 100 = 800, 2nd place tied by two | 1st 480; the two tied split 240+80=320 → 160 each |
| E9 | 7 players × 100 = 700 | 420/210/70 |
| E10 | 1 paid entrant | refund 100, no payout |

## 8. Season standings (Fun phase)
Season = calendar year (`seasonId = "2026"`). Per player: `points` (Σ entryTotal), `events`, `wins`
(rank 1, ties count), `podiums` (rank ≤3), `netTokens` (Σ payouts − Σ buy-ins), `correctWinners`, `upsets`.
Ordered by `points`.

## 9. Badges (Fun phase)
`champion` (won an event) · `perfect-card` (all winners correct, ≥4 bouts) · `upset-artist` (correct pick at
+200 or longer) · `lock-smith` (3 locks correct in a row) · `bleeder` (first blood correct) · `busted` (balance hit 0).
