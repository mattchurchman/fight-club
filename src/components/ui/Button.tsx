import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-red-fill text-white hover:bg-red-fill/90',
  secondary: 'border border-line bg-surface-2 text-text hover:bg-surface-2/80',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  danger: 'bg-red-fill text-white hover:bg-red-fill/90',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex h-12 min-w-11 items-center justify-center gap-2 rounded-[10px] px-4',
        '[font-family:var(--font-display)] text-sm font-bold uppercase tracking-[0.08em]',
        'transition-colors focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-text disabled:cursor-not-allowed',
        disabled || loading ? 'bg-steel text-muted' : variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
