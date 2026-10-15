import clsx from 'clsx';

interface TrashTalkButtonProps {
  count: number;
  onClick: () => void;
  className?: string;
}

/** Secondary pill with a message count; opens `ChatPanel` (docs/tasks/T39). Doesn't reuse the old
 * floating gold button's `text-background` class — that token doesn't exist (docs/PROGRESS.md backlog). */
export function TrashTalkButton({ count, onClick, className }: TrashTalkButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-4',
        '[font-family:var(--font-display)] text-sm font-bold uppercase tracking-[0.08em] text-text',
        'shadow-lg transition-colors hover:bg-surface-2/80',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text',
        className,
      )}
    >
      Trash talk
      {count > 0 ? (
        <span className="rounded-full bg-red-fill px-2 py-0.5 text-xs leading-none text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}
