# T52 — Fix past-events/profile history query & iPhone avatar upload

**Tier:** B · **Effort:** medium · **Size:** S · **Depends on:** —
**USER ACTION REQUIRED:** none (no index deploy — the fix removes the need for one)

## Goal
Two bugs found in the 2026-10-17 trial event. (1) Standings → "Past events" (`/events`) and the profile's
"This season" + "Event history" never load. (2) Choosing any iPhone photo on the Me tab fails with
"That image won't shrink small enough". After this task both work, with no new Firestore index and no data
model change.

## Root causes (already diagnosed — don't re-investigate)
1. `usePastEvents` (`src/features/events/hooks.ts` ~L131) and `useEventHistory`
   (`src/features/profile/hooks.ts` ~L128) both run `where('status','==','final') + orderBy('startsAt','desc')`.
   That needs a composite index (`status` + `startsAt`) that **does not exist** in `firestore.indexes.json`
   (the only events index is `enabled + startsAt`; the code comment claiming otherwise is wrong). `getDocs`
   rejects inside a `void (async () => …)()`, the rejection is swallowed, and the hook stays `undefined`
   (= skeleton forever). Lifetime stats look fine only because they live on `users/{uid}.stats`.
2. `encodeAvatar` (`src/features/profile/avatarUpload.ts`) calls `canvas.toDataURL('image/webp', q)`.
   iOS Safari can't encode WebP: it silently returns a **PNG**, ignores `q`, and a 256×256 photo PNG is
   ~100K+ chars, far over `MAX_AVATAR_CHARS` (30000). Centre-crop already exists (`planAvatarEncode`) — keep it.

## Context to load (only these)
- `AGENTS.md`
- `src/features/events/hooks.ts` (L110–175), `src/features/events/EventsArchivePage.tsx`
- `src/features/profile/hooks.ts` (L110–170), `src/features/profile/ProfileBody.tsx` (sections "This season"
  and "Event history" only)
- `src/features/profile/avatarUpload.ts` + `avatarUpload.test.ts`

## Files you may touch
`src/features/events/hooks.ts` (+ `hooks.test.ts`), `src/features/events/EventsArchivePage.tsx`,
`src/features/profile/hooks.ts`, `src/features/profile/ProfileBody.tsx`,
`src/features/profile/avatarUpload.ts` (+ `avatarUpload.test.ts`)

## Steps
1. **Query.** In both hooks drop `orderBy` and query `where('status','==','final')` only (single-field
   equality needs no composite index). Sort newest-first in memory with one small exported pure helper
   (e.g. `sortNewestFirst` in `events/hooks.ts`, reused by `profile/hooks.ts`) and unit-test it.
   Fix the stale "no new index is needed" comment.
2. **Errors.** Wrap each async body in `try/catch`. On failure set the hook's state to `null`
   (`undefined` = loading, `null` = failed, array = loaded) and `console.error` once. Callers render a short
   inline message ("Couldn't load past events." / "Couldn't load history.") instead of a skeleton.
   `ProfileBody`'s "This season" must treat `null` the same way.
3. **Avatar.** In `encodeAvatar`, after the first `toDataURL('image/webp', …)`, if the result doesn't start
   with `data:image/webp`, switch to `'image/jpeg'` for the quality loop. If JPEG at the lowest quality still
   exceeds the cap, redraw once at 192×192 and retry the loop before throwing. Keep the existing error copy.
4. **Tests.** Add a vitest case that stubs `HTMLCanvasElement.prototype.toDataURL` to return a long
   `data:image/png…` for webp and a short `data:image/jpeg…` for jpeg, and asserts the JPEG result is returned.

## Acceptance criteria
- [ ] Definition of Done passes (AGENTS.md §4) + `npm run build`
- [ ] No change to `firestore.indexes.json`, `firestore.rules` or `shared/`
- [ ] `/events` and both profile sections render rows against the emulator seed (or e2e) without a new index
- [ ] A failed load shows text, never an endless skeleton
- [ ] New sort-helper test and PNG→JPEG fallback test pass

## Out of scope
Capping/paginating the archive (backlog), any layout or styling change.

## Completion notes
_(agent fills in: ≤10 lines)_
