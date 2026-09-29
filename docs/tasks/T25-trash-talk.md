# T25 — Fight-night trash talk (comments & reactions)

**Tier:** C · **Size:** S · **Depends on:** T15
**USER ACTION REQUIRED:** none

## Goal
A lightweight event chat plus emoji reactions on each bout, so the group's banter lives next to the picks.

## Context to load (only these)
- `AGENTS.md`
- `docs/DATA_MODEL.md` → comments
- Exports only: `src/features/live/index.ts`, `src/components/ui/index.ts`

## Files you may touch
`src/features/chat/**`, `src/features/live/*` (mount the chat panel only)

## Steps
1. `useComments(eventId)`: `onSnapshot`, the last 100, ordered by createdAt.
2. A chat panel on the Live tab (a collapsible bottom sheet): message list, input (≤280 chars with a counter), optional bout tag, and quick emoji
   (🔥 😂 🩸 💀 🐐). Your own messages can be deleted. It auto-scrolls when you're at the bottom.
3. Per-bout reaction chips on the RevealGrid are a `comments` doc with an emoji and no text, shown aggregated as counts.
4. Tests: the aggregation of reactions and the input validation.

## Acceptance criteria
- [ ] Two browser sessions on the seed see each other's messages live
- [ ] Definition of Done passes. Build passes.

## Out of scope
Moderation beyond self-delete and admin delete.

## Completion notes
_(agent fills in)_
