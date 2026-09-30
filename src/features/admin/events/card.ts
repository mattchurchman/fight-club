// docs/tasks/T18 step 2: reordering/removing main-card bouts. Pure — kept separate from the
// Firestore write so the reorder arithmetic is unit-testable without a store.

export interface OrderedBout {
  id: string;
  order: number;
  isMainCard: boolean;
}

/**
 * Swaps this bout's `order` with its neighbor among main-card bouts only, so "up"/"down" always
 * moves it within the card the admin is looking at. A no-op at either end of the card, or for a
 * bout that isn't on the main card.
 */
export function moveMainCardBout<B extends OrderedBout>(
  bouts: readonly B[],
  boutId: string,
  direction: 'up' | 'down',
): B[] {
  const card = bouts.filter((b) => b.isMainCard).sort((a, b) => a.order - b.order);
  const index = card.findIndex((b) => b.id === boutId);
  if (index === -1) return bouts as B[];

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= card.length) return bouts as B[];

  const here = card[index]!;
  const there = card[swapWith]!;
  return bouts.map((bout) => {
    if (bout.id === here.id) return { ...bout, order: there.order };
    if (bout.id === there.id) return { ...bout, order: here.order };
    return bout;
  });
}

/** Adds or removes a bout from the main card — the other lever besides `order` (docs/DATA_MODEL.md). */
export function toggleMainCard<B extends OrderedBout>(bouts: readonly B[], boutId: string): B[] {
  return bouts.map((bout) => (bout.id === boutId ? { ...bout, isMainCard: !bout.isMainCard } : bout));
}

/**
 * The event's denormalized `mainCardBoutIds` display field (docs/DATA_MODEL.md), main event first.
 * Mirrors the sort `shared/validation.ts#mainCardBoutIds` uses — the function scoring actually
 * reads — so the two never disagree on order, even though nothing but display consumes this field.
 */
export function mainCardIdsInOrder(bouts: readonly OrderedBout[]): string[] {
  return bouts
    .filter((b) => b.isMainCard)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((b) => b.id);
}
