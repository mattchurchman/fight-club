# Design direction

**Feel:** fight-night poster meets a sleek sports app. Dark, punchy, confident, fun, not a casino.
The app is used on iPhones, in bars and on couches, one-handed. Everything is thumb-first.

## Tokens (define as CSS variables and Tailwind theme; support only dark mode for now)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0B0D` | app background |
| `--surface` | `#16161A` | cards, sheets |
| `--surface-2` | `#1F1F25` | raised / pressed |
| `--line` | `#2A2A31` | hairlines |
| `--text` | `#F4F4F5` | primary text |
| `--muted` | `#A1A1AA` | secondary text |
| `--red` | `#E5383B` | red corner (fighter A), primary accent, CTAs |
| `--blue` | `#3A86FF` | blue corner (fighter B) |
| `--gold` | `#F5C518` | tokens, winners, badges, rank #1 |
| `--win` | `#22C55E` / `--loss` `#EF4444` | outcomes, always paired with an icon or text |

Type: display = **Anton** (uppercase headings, event names, big numbers) via `@fontsource/anton`;
body/UI = **Inter** via `@fontsource/inter`. Numbers use `font-variant-numeric: tabular-nums`.
Radius 16px (cards), 999px (chips). Spacing on a 4px grid. Minimum tap target 44×44.

## Layout
- Mobile-first, max content width 640px, centered on desktop.
- **Bottom tab bar** (safe-area aware): `Fights` · `Live` · `Standings` · `Wallet` · `Me`.
  Admins also see a gear in the header that opens `/admin`.
- Header: event name in Anton, plus a countdown chip to lock ("Locks in 2h 14m").

## Key components
- **BoutCard:** two fighter halves side by side (red left, blue right) with a headshot (fallback: initials
  on a corner-colored circle), name, record and odds. Tapping a half selects the winner with a glow and check.
  Below: method chips `KO/TKO · SUB · DEC` and a stake stepper (−/+ by 25, with presets 50/100/200/400).
  A 🔒 toggle marks the Lock of the Night (one per entry). A main-event bout gets a gold "MAIN EVENT" ribbon.
- **BudgetMeter:** sticky bar above the tab bar showing `Allocated 850 / 1000` and a progress bar. It turns gold
  at exactly 1000. The Submit button lives here.
- **RevealGrid:** after lock, one row per bout with each friend's avatar placed on the side they picked. Lock picks get a 🔒.
- **LiveLeaderboard:** rank, avatar, name and points, with an animated rank change (respect `prefers-reduced-motion`).
- **TokenPill:** gold coin icon and balance, shown in the header.
- Toasts for success and errors (not `alert()`), and skeleton loaders, not spinners, for lists.

## Voice
Short, playful, a little trash-talky. Examples: "Picks locked. No take-backs." · "You're broke. Beg the admin." · "Called the upset 🔥".

## Accessibility
WCAG AA contrast. Never use color alone (pair with icon or text). Focus rings visible. All controls reachable
by keyboard. Images have alt text (fighter name).

## PWA
Name "Fight Club", short name "Fight Club", theme `#0B0B0D`, display `standalone`, portrait.
The icon is a simple original mark: a gold fist or octagon glyph on near-black. **Don't use UFC logos or trademarks.**
iOS install needs `apple-touch-icon`, and there's an `/install` help page with Share → Add to Home Screen instructions.
