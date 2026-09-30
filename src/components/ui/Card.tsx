import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={clsx('rounded-card border border-line bg-surface p-4', className)} {...rest}>
      {children}
    </div>
  );
}
