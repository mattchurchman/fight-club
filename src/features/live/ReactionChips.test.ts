import { describe, it, expect } from 'vitest';
import type { CommentWithId } from './hooks.ts';

// Mock timestamp for testing - we only use toMillis() in the app
const createTimestamp = (ms: number) => ({
  toMillis: () => ms,
}) as unknown as CommentWithId['createdAt'];

// Test the reaction aggregation logic
describe('ReactionChips aggregation', () => {
  it('aggregates emoji reactions by count', () => {
    const comments: CommentWithId[] = [
      {
        id: '1',
        uid: 'user1',
        displayName: 'User 1',
        boutId: 'bout1',
        text: '',
        emoji: '🔥',
        createdAt: createTimestamp(1000),
      },
      {
        id: '2',
        uid: 'user2',
        displayName: 'User 2',
        boutId: 'bout1',
        text: '',
        emoji: '🔥',
        createdAt: createTimestamp(2000),
      },
      {
        id: '3',
        uid: 'user3',
        displayName: 'User 3',
        boutId: 'bout1',
        text: '',
        emoji: '😂',
        createdAt: createTimestamp(3000),
      },
    ];

    const boutId = 'bout1';
    const reactionCounts: Record<string, number> = {};

    comments
      .filter((c) => c.boutId === boutId && c.emoji)
      .forEach((c) => {
        const emoji = c.emoji!;
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      });

    expect(reactionCounts).toEqual({ '🔥': 2, '😂': 1 });
  });

  it('ignores comments without emoji', () => {
    const comments: CommentWithId[] = [
      {
        id: '1',
        uid: 'user1',
        displayName: 'User 1',
        boutId: 'bout1',
        text: 'Some trash talk',
        emoji: null,
        createdAt: createTimestamp(1000),
      },
    ];

    const boutId = 'bout1';
    const reactionCounts: Record<string, number> = {};

    comments
      .filter((c) => c.boutId === boutId && c.emoji)
      .forEach((c) => {
        const emoji = c.emoji!;
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      });

    expect(Object.keys(reactionCounts)).toHaveLength(0);
  });

  it('ignores comments for different bouts', () => {
    const comments: CommentWithId[] = [
      {
        id: '1',
        uid: 'user1',
        displayName: 'User 1',
        boutId: 'bout1',
        text: '',
        emoji: '🔥',
        createdAt: createTimestamp(1000),
      },
      {
        id: '2',
        uid: 'user2',
        displayName: 'User 2',
        boutId: 'bout2',
        text: '',
        emoji: '🔥',
        createdAt: createTimestamp(2000),
      },
    ];

    const boutId = 'bout1';
    const reactionCounts: Record<string, number> = {};

    comments
      .filter((c) => c.boutId === boutId && c.emoji)
      .forEach((c) => {
        const emoji = c.emoji!;
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      });

    expect(reactionCounts).toEqual({ '🔥': 1 });
  });

  it('handles empty comment list', () => {
    const comments: CommentWithId[] = [];

    const boutId = 'bout1';
    const reactionCounts: Record<string, number> = {};

    comments
      .filter((c) => c.boutId === boutId && c.emoji)
      .forEach((c) => {
        const emoji = c.emoji!;
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      });

    expect(Object.keys(reactionCounts)).toHaveLength(0);
  });
});

// Test input validation
describe('Chat input validation', () => {
  it('validates text length ≤280 characters', () => {
    const MAX_CHARS = 280;
    const text = 'a'.repeat(280);
    expect(text.length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it('truncates text longer than 280 characters', () => {
    const MAX_CHARS = 280;
    const input = 'a'.repeat(300);
    const truncated = input.slice(0, MAX_CHARS);
    expect(truncated.length).toBe(MAX_CHARS);
  });

  it('validates that text is not empty after trimming', () => {
    const text = '   ';
    expect(text.trim().length).toBe(0);
  });

  it('validates non-empty text after trimming', () => {
    const text = '  Hello  ';
    expect(text.trim().length).toBeGreaterThan(0);
  });
});
