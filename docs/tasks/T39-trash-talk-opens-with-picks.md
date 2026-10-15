# T39 — Trash talk opens with picks

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** T31, T36
**USER ACTION REQUIRED:** none

## Goal
Trash talk is available from the moment picks open (about a week before the fight), not only after lock, and the
chat gets the v2.1 look. Picks stay secret; only the chat opens early.

## Context to load (only these)
- `AGENTS.md`
- `docs/DESIGN.md` → "Trash talk"
- `src/features/chat/ChatPanel.tsx`
- `firestore.rules` lines 295–325 (comments block) — read only
- Exports only: `src/features/live/hooks.ts` (`useComments`)

## Files you may touch
`src/features/chat/**`, `src/features/events/EventPage.tsx`, `src/features/live/LivePage.tsx`,
`tests/rules/ledger-tokens-comments.test.ts`

## Steps
1. Confirm (don't change) that `firestore.rules` lets members create/read comments regardless of event status. Add a
   rules test: a member can create a comment on an event with `status: 'open'` and `lockAt` in the future.
   If it fails, stop and mark BLOCKED (rules changes need Tier A).
2. Extract a `TrashTalkButton` (`count` of comments, `onClick`) — secondary pill: `Trash talk` + count. Fixes the old
   `text-background` bug by not reusing it.
3. EventPage: when status is `open`, `locked` or `live`, show `TrashTalkButton` under the card list; it opens `ChatPanel`.
4. LivePage: replace the floating gold button with `TrashTalkButton` (fixed above the tab bar, same place).
5. ChatPanel restyle: `SectionLabel` header; messages as rows (octagon avatar, name in `text`, body, fight tag in `muted`
   `on Figueiredo / Talbott`); composer: textarea on `surface-2`, reaction chips, `Send` primary button. When status is
   `open`: muted line `Picks stay secret until lock.` above the composer.

## Acceptance criteria
- [x] Definition of Done passes; `npm run test:rules`; `npm run build` passes.
- [x] On an open event (before lock): Fights tab shows Trash talk; posting works; no one else's picks are visible.

## Out of scope
Push notifications for mentions. Rules changes.

## Completion notes
- Confirmed `firestore.rules` comments block already gates on `canRead()`/`isMember()`, not event
  status; added a rules test posting/reading on `EVT.open` (lockAt in the future) to lock that in.
- New `TrashTalkButton` (count pill, secondary style) replaces the old floating gold button and its
  dead `text-background` class in both `EventPage` and `LivePage`.
- `EventPage` now shows the button (and mounts `ChatPanel`) for `open`/`locked`/`live` events, under
  the card list. `LivePage` shows it in both the pre-lock countdown branch and the revealed branch.
- `ChatPanel` restyled: `SectionLabel` header, row-based messages (no `Card` wrapper), fight tag
  shows both fighters, surface-2 inputs, and a "Picks stay secret until lock." line via a new
  `picksSecret` prop (passed when `event.status === 'open'`).
- Definition of Done green: lint, typecheck, unit tests (512), `test:rules` (112, incl. new test),
  build.
