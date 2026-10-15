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
- [ ] Definition of Done passes; `npm run test:rules`; `npm run build` passes.
- [ ] On an open event (before lock): Fights tab shows Trash talk; posting works; no one else's picks are visible.

## Out of scope
Push notifications for mentions. Rules changes.

## Completion notes
_(agent fills in: ≤10 lines)_
