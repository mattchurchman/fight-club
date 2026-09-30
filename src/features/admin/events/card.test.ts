import { describe, expect, it } from 'vitest';
import { mainCardIdsInOrder, moveMainCardBout, toggleMainCard } from './card.ts';
import type { OrderedBout } from './card.ts';

const CARD: OrderedBout[] = [
  { id: 'main', order: 1, isMainCard: true },
  { id: 'co-main', order: 2, isMainCard: true },
  { id: 'three', order: 3, isMainCard: true },
  { id: 'prelim', order: 4, isMainCard: false },
];

describe('moveMainCardBout', () => {
  it('swaps order with the bout above it', () => {
    const next = moveMainCardBout(CARD, 'co-main', 'up');
    expect(mainCardIdsInOrder(next)).toEqual(['co-main', 'main', 'three']);
  });

  it('swaps order with the bout below it', () => {
    const next = moveMainCardBout(CARD, 'co-main', 'down');
    expect(mainCardIdsInOrder(next)).toEqual(['main', 'three', 'co-main']);
  });

  it('is a no-op moving the main event up', () => {
    expect(moveMainCardBout(CARD, 'main', 'up')).toEqual(CARD);
  });

  it('is a no-op moving the last main-card bout down', () => {
    expect(moveMainCardBout(CARD, 'three', 'down')).toEqual(CARD);
  });

  it('never reorders against a prelim bout', () => {
    expect(moveMainCardBout(CARD, 'prelim', 'up')).toEqual(CARD);
  });

  it('ignores an unknown bout id', () => {
    expect(moveMainCardBout(CARD, 'ghost', 'up')).toEqual(CARD);
  });
});

describe('toggleMainCard', () => {
  it('removes a bout from the main card', () => {
    const next = toggleMainCard(CARD, 'three');
    expect(mainCardIdsInOrder(next)).toEqual(['main', 'co-main']);
  });

  it('adds a prelim bout back onto the main card', () => {
    const next = toggleMainCard(CARD, 'prelim');
    expect(mainCardIdsInOrder(next)).toEqual(['main', 'co-main', 'three', 'prelim']);
  });
});

describe('mainCardIdsInOrder', () => {
  it('orders main event first, ties broken by id', () => {
    const tied: OrderedBout[] = [
      { id: 'b', order: 1, isMainCard: true },
      { id: 'a', order: 1, isMainCard: true },
    ];
    expect(mainCardIdsInOrder(tied)).toEqual(['a', 'b']);
  });
});
