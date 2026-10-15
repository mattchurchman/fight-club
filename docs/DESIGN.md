# Design direction — v2.1 "The Minimal"

Replaces the v2.0 gold/red/blue look (archived in `docs/DESIGN_v2.0.md`, history only — don't load it).
**Feel:** clean / bold / timeless. Serious competition, simple, focused. Black and charcoal surfaces,
white type, **one** red accent. Used on iPhones, in bars and on couches, one-handed. Thumb-first.
Tasks load only the `##` sections they name.

## Tokens
Defined once in `src/index.css` `@theme`. Dark mode only.

| Token | Value | Use |
|---|---|---|
| `bg` | `#0A0A0B` | app background |
| `surface` | `#141416` | cards, sheets, tab bar |
| `surface-2` | `#1E1E21` | raised / pressed / inputs |
| `line` | `#2C2C30` | hairlines, outlines |
| `steel` | `#4A4A50` | inactive marks, disabled fills, progress track |
| `text` | `#F5F5F5` | primary text, tokens, "your pick" outline |
| `muted` | `#9A9AA0` | secondary text (7:1 on bg) |
| `red` | `#E8221B` | brand: logo bar, accent bars, active indicators, large fills (≥18px bold text only) |
| `red-fill` | `#D41D17` | buttons/pills with white text (5.3:1) |
| `red-text` | `#FF4136` | small red text on dark (≥5.3:1): errors, "LIVE" |
| `win` | `#22C55E` | correct pick / positive delta. Functional only, always with ✓ or `+` |

There is **no** gold, **no** blue, **no** loss color. A wrong pick = `muted` + ✗. A negative delta = `muted` with `−`.
Red is never used to mean "wrong" — it means *you / action / live*.

**Migration aliases (T26 → removed in T43).** So the whole app reskins at once, T26 keeps the old class names
pointing at new values: `gold → text`, `blue → steel`, `loss → red-text`. Sweep tasks replace them with the
real tokens using this map; T43 deletes the aliases.

| Old usage | New |
|---|---|
| `text-gold` on tokens/balances | `text-text` + `<Coin/>` |
| `gold` as "selected / mine / #1" ring or fill | `ring-text` (2px) + red accent bar |
| `bg-gold` pill (e.g. MAIN EVENT) | `bg-red-fill text-white` |
| `text-blue` / `bg-blue` / corner colors | remove; neutral (`text`/`steel`) |
| `text-loss` for errors | `text-red-text` |
| `text-loss` / `bg-loss` for "wrong" | `text-muted` + ✗ |

## Type
- **Display/headlines:** Montserrat 800 (900 for hero numbers), UPPERCASE, tracking `0.02em`. Package `@fontsource/montserrat`
  (import weights 600/700/800/900 only). Utility class `.font-display` now means Montserrat 800 uppercase.
- **Labels:** Montserrat 600, 11–12px, UPPERCASE, tracking `0.2em`, `muted` — the "CLEAN / BOLD / TIMELESS" style.
  Use ` / ` (spaced slash) as the separator in label rows: `WELTERWEIGHT / 3 RDS`.
- **Body/UI:** Inter (unchanged). Numbers: `tabular-nums`; big numbers use display font.
- Anton is removed (T26 drops the dependency).

## Shape & motifs
- **Octagon** is the brand shape: logo, token coin, avatar/headshot frames, badge tiles. CSS:
  `clip-path: polygon(25% 0, 75% 0, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0 75%, 0 25%)` (the logo's octagon:
  corners cut at 25% of the width — slightly longer sides than a regular octagon, so the word fits the break)
  → utility `.octagon` in `index.css`.
- **Red bar:** a 24×3px red rule. Under section titles (`<SectionLabel>`), as the active tab indicator (top edge of the tab),
  under the selected fighter.
- Radius: cards 12px (`--radius-card`), buttons 10px, chips 8px (not pills). Hairline borders over shadows.
- Spacing on a 4px grid. Minimum tap target 44×44. Max content width 640px.
- Motion: 150–250ms ease-out; every animation off under `prefers-reduced-motion`.

## Brand assets
In `public/brand/` (outlined paths, no font dependency — don't edit by hand).
Four marks, each with one job:

| File | What it is | Use it for | Don't |
|---|---|---|---|
| `logo-lockup.svg` | Octagon + FIGHT / CLUB + red bar, white, transparent | Big brand moments: login, not-invited, install page, share posters | Use below 120px wide (CLUB stops reading) |
| `icon-source.svg` | The lockup on full-bleed `#0A0A0B` | **The app icon.** T28 copies it to `public/icon.svg`; PWA PNGs + apple-touch icon are generated from it | Use inside the app UI |
| `mark.svg` | Octagon + FC + red bar, white, transparent | **The permanent header** (28px, top-left), favicon, anywhere under 120px | Pair it with the lockup on the same screen |
| `monogram.svg` | Black FC octagon on a red tile | Loud contexts: the link-preview image when someone pastes the app URL in a group chat; an alternate app icon if you ever want one | Use as a second header logo |

Plus `coin.svg` — the token glyph (`currentColor`), used by `<Coin/>` / TokenPill. Never use UFC logos or marks.

## Components (shared UI kit, `src/components/ui/`)
- **Button** — primary: `bg-red-fill` white Montserrat 700 uppercase 14px tracking 0.08em, radius 10, h-12.
  secondary: `surface-2` + `line` border. ghost: text only. Disabled: `steel` fill, `muted` text — never red.
- **Chip** — radius 8, `line` border; selected = `text` bg with `bg`-colored text (inverted), not red.
- **Coin / TokenPill** — octagon coin glyph (`coin.svg` as inline component) + white tabular number. No gold.
- **Avatar** — octagon-clipped; fallback = initials in display font on `surface-2`. `corner` prop is gone (neutral).
- **SectionLabel** (new) — label style + red bar beneath. Used for every section heading.
- **Card** — `surface`, `line` border, radius 12, padding 16.
- **Sheet** — bottom sheet, `surface`, top grabber, radius 16 top corners.
- **StatusPill** (new) — `PICKS OPEN` (white outline) · `LOCKED` (steel fill) · `● LIVE` (`red-text`, pulsing dot) ·
  `FINAL` (muted outline) · `CANCELLED` (muted, strikethrough).

## App shell
- **Header** (56px + safe area): left = `mark.svg` (28px) linking to `/`, then the section name in **label style**
  (small, muted — not a big headline); right = TokenPill, help, admin gear (admins).
- **TabBar**: `Fights · Live · Standings · Wallet · Me`. Active = `text` color + 3px red bar on the tab's top edge.
  Hidden while the pick deck is open (see Pick deck).
- Toasts, not `alert()`. Skeletons, not spinners.

## Event header (Fights tab)
`UFC 332` (label style) above the headline `SILVA / WANG` (display, from `subtitle`; never repeat the event name twice).
Row: date · venue (muted) and a **StatusPill**. Countdown to lock: normal text when > 1h;
under 1h it turns `red-text` and shows seconds ("LOCKS IN 42:07"). Locked+: Buy-in and Pot as Coin values.

## Pick deck (replaces BoutCard pick mode + BudgetMeter)
Full-height, **one fight per screen, swiped horizontally** (CSS scroll-snap, no library). Order = card order, main event first.
Last slide = **Review**. Tab bar hidden; a slim top strip replaces the old sticky meter.

```
┌──────────────────────────────┐
│ ✕   FIGHT 2 / 5     ▮▮▯▯▯ ▯  │  progress strip: one segment per fight (+review). filled = complete
│ 300 / 1000 PTS               │  allocated / budget (white; at budget shows ✓)
├──────────────────────────────┤
│ BANTAMWEIGHT / 3 RDS         │  label (MAIN EVENT gets a red-fill tag)
│ ┌────────────┐┌────────────┐ │
│ │  headshot  ││  headshot  │ │  two tall fighter panels, tap to pick
│ │ FIGUEIREDO ││  TALBOTT   │ │  surname in display font, first name small
│ │ 25-7-1     ││ 11-1-0     │ │
│ │ +130  43%  ││ −155  61%  │ │
│ └────────────┘└────────────┘ │  picked: 2px white outline, red bar under name, "✓ YOUR PICK" label;
│                              │  other side dims to 40%
│ HOW  [ KO ][ SUB ][ DEC ]    │  chips (inverted when selected); KO includes TKO
│ STAKE [50][100][150][200][300][400]  −  ⊕  │  preset chips + fine −/+ 25
│ 🔒 MAKE THIS MY LOCK          │  toggle row
│ IF RIGHT  +396 PTS            │  win-colored preview (only when complete)
│            [ NEXT FIGHT → ]   │  appears when the fight is complete
└──────────────────────────────┘
```
- **No default stake.** A fight is complete when winner + method + stake are set. Stake shows `—` until chosen.
- Choosing the method on a fight that already has a stake auto-advances after 400ms (not under reduced motion).
- **No validation errors before the first submit attempt.** After a failed attempt, incomplete fights get a `red-text`
  dot in the progress strip and a one-line reason on their slide.
- **Review slide:** list of all fights, one row each: `FIGUEIREDO · DEC · [−] 200 [+] · 🔒`. Tap the row's name to jump to
  that slide. Lock is chosen here too (tap 🔒 on a row; one at a time). First Blood picker (if enabled) below.
  Auto-balance (secondary button). Primary button label reflects state: `PICK 3 MORE FIGHTS` (disabled) ·
  `ADJUST STAKES: 150 LEFT` (disabled) · `CHOOSE YOUR LOCK` (disabled) · `SUBMIT PICKS` · after submit `UPDATE PICKS`.
  Broke: the button reads `YOU'RE BROKE. BEG THE ADMIN.` and links to Wallet.
- **Entry point:** Fights tab shows the event header + a compact **card list** (one row per fight: names, odds, and your pick
  if any) + a full-width primary button `MAKE YOUR PICKS` / `EDIT PICKS`. Tapping a row opens the deck on that fight.
- **Locked / read-only:** no deck. Card list rows show your pick, method, stake, 🔒, and score once final.
- Draft autosave, validation, auto-balance and submit reuse `usePickDraft` / `shared/validation.ts` unchanged.

## Live tab
Answers three questions in order: **What's happening now? Where do I stand? What happened?**
Fight order on the night = descending `bout.order` (main event, order 1, is last). Jobs never set `bout.status = 'live'`;
"current" = the first bout in fight order with no result and not cancelled.

```
┌──────────────────────────────┐
│ ● LIVE  FIGHT 3 OF 5  POT ⬡600│  status strip (StatusPill, progress, pot)
├──────────────────────────────┤
│ IN THE CAGE                  │  "UP NEXT" while locked & no results yet; "IN THE CAGE" once live
│  GREEN        vs   RIBOVICS  │  headshots, odds
│  M  T              J  A  K  S│  who picked each side (avatars, 🔒 marks locks)
│  IF GREEN WINS: Tony → 1st, you → 3rd (+160)
│  IF RIBOVICS WINS: you → 2nd (+285)       │  swing lines (your outcome first, then any lead change)
├──────────────────────────────┤
│ YOU  #4  470 PTS  ▲1         │  your row, always visible (sticky under status strip)
├──────────────────────────────┤
│ STANDINGS                    │  leaderboard v2
│ 1 ▲2 TONY      936   ✓✓·· ·  │  rank, movement since last result, name, points,
│ 2 ▼1 ANDRE     753   ✓✓·· ·  │  per-fight marks in FIGHT ORDER (✓ win, ✗ muted, · pending, – push)
│ …                            │  column header row shows F1…F5 so marks are readable
├──────────────────────────────┤
│ RESULTS                      │  finished fights, newest first:
│ SOLDIĆ def. WILLIAMS · DEC R3│  "4 of 6 had Soldić · you +466"
└──────────────────────────────┘
```
- Swing math: for the current bout and each side, assume every entry that picked that side wins **base + lock** and
  ignore the unknown method bonus (label it "at least"). Re-rank with `rankEntries`. Show at most 2 lines.
- **Result flash:** when a bout gets a result while the page is open, a 2.5s top overlay:
  `SOLDIĆ def. WILLIAMS — DEC R3` + your delta (`+466 ✓` or `0 ✗`) + rank change. Tap to dismiss. Static under reduced motion.
- **Before lock:** `PICKS LOCK IN` countdown + the card list (no picks) + Trash Talk.
- **Final:** status strip shows `FINAL · POT PAID`; leaderboard adds a payout column (Coin); results list stays.
- Tapping a leaderboard row opens the PlayerSheet (their full card + scoring breakdown, pending fights say `PENDING`)
  with a `VIEW PROFILE` link.

## Trash talk
Open from the moment an event is **open** (picks open, typically a week out) through final. Entry points: a `TRASH TALK`
button on the Fights tab (open/locked) and on the Live tab. Same `ChatPanel` sheet, restyled. Before lock, a muted line:
"Picks stay secret until lock." Fight tags are allowed before lock (they reveal nothing).

## Archive & profiles
- **Past events** (`/events`): every final event, newest first: name, date, winner, pot, your rank. Linked from Standings
  (`PAST EVENTS →`) and from the event switcher. Opens `/event/:id`, which for a final event shows: final leaderboard with
  payouts, results list, and the reveal grid (everyone's picks).
- **Profiles** (`/u/:username`): reachable from every name/avatar (leaderboard, reveal, chat, standings, PlayerSheet).
  Shows octagon avatar, @username, season + lifetime stats, badges (octagon tiles; locked badges dimmed), event history
  (rows link to that event) and, on someone else's profile, **your head-to-head vs them** at the top.

## Voice
Short, playful, a little trash-talky. Buttons and labels *look* uppercase, but **author all copy in sentence case and
uppercase it with CSS** (`uppercase` / `.font-display`) so accessible names — and the e2e tests that select by them
(`Submit picks`, `Auto-balance`, `Pick <name>`, `KO`) — stay stable. "Picks locked. No take-backs." ·
"You're broke. Beg the admin." · "Called the upset." Emojis only in user content and reactions, not in UI chrome (🔒 excepted).

## Accessibility
WCAG AA. Never color alone (✓/✗/▲/▼/text). Focus rings: 2px `text` outline, offset 2. Keyboard-reachable controls;
the pick deck also works with ←/→ and has "Previous/Next fight" buttons for screen readers. Images have alt text.

## PWA
Name/short name "Fight Club", theme and background `#0A0A0B`, standalone, portrait. Icons are generated from
`public/icon.svg` (a copy of `public/brand/icon-source.svg`) by `npm run generate-pwa-assets`.
