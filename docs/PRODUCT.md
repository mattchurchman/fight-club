# Product brief — Fight Club v2

## Why it exists
A private game for one friend group to settle who calls UFC fights best: bragging rights first.
Admin (the owner) runs it. Tokens are a scarce currency the admin hands out; when you're broke you
ask the admin for more. Any real-world money for tokens happens **outside** the app.

## Users
- **Players.** Friends, invite-only, mostly on iPhones. They install the app to their home screen (PWA).
- **Admin.** The owner. Invites people, grants tokens, fixes data, enters props that can't be automated.

## Core loop (per numbered UFC event)
1. **Auto-import.** Jobs find upcoming numbered events (`UFC 3xx`), import the **main card** bouts,
   fighters, records, headshots and moneyline odds. No manual card building.
2. **Open.** Players pay the event **buy-in** in tokens and build picks: tap a winner, choose a method,
   spread 1,000 play-points across bouts, and name one **Lock of the Night**. The optional First Blood prop is available when enabled.
3. **Lock.** Picks freeze at main-card start. Everyone's picks are revealed side by side.
4. **Live.** Results auto-import during the event. The leaderboard updates live.
5. **Final.** Scores are finalized, the pot is paid out in tokens, standings and badges update, and a share image is ready for the group chat.

## Feature list (MVP, then Fun)
MVP: invite-only auth · auto-imported events/bouts/odds/headshots · tap-to-pick builder · lock at start ·
pick reveal · live leaderboard · auto results & scoring · token wallet + ledger · token requests ·
admin console (invites, tokens, event overrides, manual results/first blood) · installable PWA.

Fun: season standings · head-to-head records vs each friend · profiles & history · shareable result
card · badges · push notifications (lock reminder, results) · per-fight trash talk / reactions.

## Non-goals
Real-money wagering or cash-out · public sign-up · multiple leagues or groups · native App Store app ·
prelims betting (main card only; admin can toggle Fight Nights on) · round/time props (possible later).

## Decisions already made (see DECISIONS.md for changes)
- Start fresh. No legacy data migration.
- Numbered events on by default. Fight Nights are imported but disabled until the admin enables them.
- Economy = **buy-in pot** (details in GAME_RULES.md). Tokens are never convertible to cash or prizes.
- Confidence ranking is replaced by a single **Lock of the Night**.
- Method-of-victory odds are replaced by fixed method multipliers, because no free data source exists.
- First Blood stays as an optional, admin-entered prop.
