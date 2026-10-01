import { useMemo } from 'react';
import type { CommentWithId } from './hooks.ts';

interface ReactionChipsProps {
  boutId: string;
  comments: CommentWithId[] | undefined;
}

export function ReactionChips({ boutId, comments }: ReactionChipsProps) {
  const reactionCounts = useMemo(() => {
    if (!comments) return {};

    return comments
      .filter((c) => c.boutId === boutId && c.emoji)
      .reduce(
        (acc, c) => {
          const emoji = c.emoji!;
          acc[emoji] = (acc[emoji] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
  }, [comments, boutId]);

  const reactions = Object.entries(reactionCounts);

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {reactions.map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3"
        >
          <span>{emoji}</span>
          <span className="text-muted">{count}</span>
        </button>
      ))}
    </div>
  );
}
