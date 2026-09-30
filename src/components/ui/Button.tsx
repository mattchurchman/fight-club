import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-red text-text hover:bg-red/90',
  secondary: 'bg-surface-2 text-text hover:bg-surface-2/80',
  ghost: 'bg-transparent text-text hover:bg-surface-2',
  danger: 'bg-loss text-text hover:bg-loss/90',
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
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-4',
        'text-sm font-semibold transition-colors focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed',
        'disabled:opacity-50',
        variantClasses[variant],
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
