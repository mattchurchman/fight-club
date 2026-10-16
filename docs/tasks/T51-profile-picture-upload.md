# T51 — Profile picture upload (octagon avatars)

**Tier:** B · **Effort:** high · **Size:** M · **Depends on:** —
**USER ACTION REQUIRED:** none

## Goal
A player can upload their own profile picture from the Me tab. It is stored as a downscaled data URI on their
own `users/{uid}` doc, and **every other player sees it everywhere in the app, including the live leaderboard
during a fight night**. Octagon framing already exists — `Avatar.tsx` clips with the `.octagon` utility and
already accepts `src`; this task feeds it, it does not restyle it.

## Why a data URI and not Cloud Storage
`AGENTS.md` §2 forbids Cloud Storage (it needs the Blaze plan — this project is $0/Spark). So the bytes live in
Firestore on the user's own doc. At this app's scale (one friend group, ~10–15 players) that is cheap and it
removes the upload/download/CORS plumbing entirely. It also fixes `ResultsPoster` for free: `html-to-image`
cannot read cross-origin images, but a data URI always rasterizes.

## Context to load (only these)
- `AGENTS.md`
- `src/components/ui/Avatar.tsx`, `src/index.css` → the `@utility octagon` block (line ~45)
- `src/features/auth/MePage.tsx`, `src/features/profile/ProfileBody.tsx`
- `firestore.rules` → `profileEditOk` (lines ~134–147) and `match /users/{uid}` (lines ~149–157)
- `src/features/live/leaderboard.ts`, `src/features/live/LiveLeaderboard.tsx`, `src/features/live/PlayerSheet.tsx`
- `src/features/standings/StandingsPage.tsx` lines 15–25 (the existing `useUsersById` join to copy)
- `shared/types.ts` → `User` (line ~64) and the denormalized `displayName`/`photoURL` pairs (lines ~187, 203, 223, 234)

## Files you may touch
`src/features/auth/MePage.tsx`, `src/features/profile/avatarUpload.ts` (new) + its test,
`src/components/ui/Avatar.tsx` (only if a loading state is needed), `firestore.rules`,
`tests/rules/*` (the users-profile spec), `src/features/live/leaderboard.ts` (+ its test),
`src/features/live/LiveLeaderboard.tsx`, `src/features/live/PlayerSheet.tsx`,
`src/features/admin/TokensPage.tsx`, `src/features/share/ResultsPoster.tsx`, `src/features/chat/ChatPanel.tsx`

## Steps
1. **Pure resize/encode module** — `src/features/profile/avatarUpload.ts`. Export a pure
   `planAvatarEncode(width, height)` returning the target draw box for a 256×256 square cover-crop (centre crop,
   no stretch) so the geometry is unit-testable without a DOM, plus an `encodeAvatar(file)` that does the
   `createImageBitmap` → `OffscreenCanvas`/`<canvas>` → `toDataURL('image/webp', 0.8)` work. Reject non-image
   MIME types and files over 10 MB *before* decoding. If the encoded string exceeds `MAX_AVATAR_CHARS`, retry at
   q=0.6 then q=0.45, and fail with a clear message rather than writing an oversized doc. Export
   `MAX_AVATAR_CHARS = 30000` from here and use it in both the UI and the rules test.
2. **Raise the rules cap.** `firestore.rules:142` currently caps `photoURL` at 500 chars — sized for a Google
   sign-in URL, far too small for a data URI. Raise it to 30000 and keep the `== null` branch. Add rules tests:
   a 30000-char `photoURL` is accepted, 30001 is rejected, another player still cannot write your `photoURL`.
   `npm run test:rules` is required by the DoD for this change.
3. **Me tab upload UI.** In `MePage.tsx`, an octagon `<Avatar>` with a "Change photo" control beneath it
   (`<input type="file" accept="image/*">`, visually hidden, triggered by a 44px-tall `<Button>`). Show a pending
   state while encoding, an inline error on failure, and a "Remove photo" action that writes `photoURL: null`.
   Write with `updateDoc(doc(db,'users',uid), { photoURL })` — `profileEditOk` already allows the field.
4. **Live tab must show everyone's current picture.** `leaderboard.ts:33` reads `entry.photoURL`, a copy
   denormalized when the pick was submitted — so a picture changed after picks were locked would show stale or
   missing on fight night. Join on the live user docs instead, exactly as `StandingsPage` already does with
   `useUsersById`: pass `usersById` into `LiveLeaderboard` and `PlayerSheet` and prefer
   `usersById[uid]?.photoURL ?? entry.photoURL`. `/users` already allows `list` to any approved player
   (`firestore.rules:151`), so no rules change is needed for the read. Do **not** backfill `Entry.photoURL`;
   leave the denormalized copies as the fallback they are.
5. **Wire the three Avatars that never got a `src`:** `TokensPage.tsx:50`, `ResultsPoster.tsx:51`,
   `ChatPanel.tsx:139`. Each has the uid or a user row in scope — join the same way.

## Acceptance criteria
- [ ] Definition of Done passes, plus `npm run test:rules` and `npm run build`.
- [ ] At 375px the Me-tab control is a 44px tap target and the octagon avatar is not distorted for a
      non-square source image (centre-cropped, not stretched).
- [ ] A picture uploaded by one account is visible to a *different* account on the Live leaderboard,
      Players sheet, Standings, People and Chat.
- [ ] Changing your picture after picks are locked updates what others see on the Live tab.
- [ ] An encoded avatar is ≤30000 chars; an image that cannot be squeezed under that fails with a visible error
      and writes nothing.

## Out of scope
Fighter headshots (already come from ESPN via `headshotUrl`). Cropping/zoom UI — centre-crop only. Backfilling
`Entry.photoURL` on historical entries. Any change to `.octagon` or the `Avatar` layout.

## Completion notes
Built `avatarUpload.ts` (pure `planAvatarEncode` centre-crop geometry + `encodeAvatar` canvas/WebP
pipeline, `MAX_AVATAR_CHARS = 30000`); wired Me-tab upload/remove UI; raised the `photoURL` rules
cap to 30000 with new rules tests (accept at cap, reject over, deny writing another player's).
`buildLeaderboard` now takes an optional `usersById` map and prefers its `photoURL`;
`LiveLeaderboard`/`PlayerSheet`/`TokensPage`/`ChatPanel` each call `useUsersById()` themselves
(same pattern `StandingsPage`/`ProfileBody` already used) rather than needing it threaded down
through `LivePage`/`EventPage`, which stayed out of the allowed-files list. `ResultsPoster` and
`PeopleSection` needed no plumbing — they already read a live `photoURL`. `encodeAvatar`'s actual
canvas work isn't covered by `vitest` (jsdom has no canvas, no approved dep adds one); only the
pure geometry and the rules/component joins are tested.

`git diff --stat`:
```
 docs/PROGRESS.md                           |  2 +-
 firestore.rules                            |  2 +-
 src/features/admin/TokensPage.tsx          | 13 +++++--
 src/features/auth/MePage.tsx               | 58 +++++++++++++++++++++++++++++-
 src/features/chat/ChatPanel.tsx            |  8 ++++-
 src/features/live/LiveLeaderboard.test.tsx | 11 ++++++
 src/features/live/LiveLeaderboard.tsx      |  4 ++-
 src/features/live/PlayerSheet.test.tsx     | 25 ++++++++++++-
 src/features/live/PlayerSheet.tsx          |  9 ++++-
 src/features/live/leaderboard.test.ts      | 14 ++++++++
 src/features/live/leaderboard.ts           | 14 ++++++--
 src/features/share/ResultsPoster.tsx       |  5 +--
 tests/rules/users.test.ts                  | 15 ++++++++
 13 files changed, 165 insertions(+), 15 deletions(-)
 src/features/profile/avatarUpload.ts       | new file (62 lines)
 src/features/profile/avatarUpload.test.ts  | new file (20 lines)
```
