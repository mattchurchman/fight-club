import type { ReactNode } from 'react';
import clsx from 'clsx';

interface SectionLabelProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionLabel({ children, action, className }: SectionLabelProps) {
  return (
    <div className={clsx('flex items-center justify-between gap-3', className)}>
      <div className="flex flex-col gap-1">
        <span className="label">{children}</span>
        <span aria-hidden="true" className="h-[3px] w-6 bg-red" />
      </div>
      {action}
    </div>
  );
}
