import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

export function Chip({ selected = false, onSelect, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={clsx(
        'min-h-11 rounded-chip border px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        selected
          ? 'border-gold bg-gold/15 text-gold'
          : 'border-line bg-surface-2 text-muted hover:text-text',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
