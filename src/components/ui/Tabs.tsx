import clsx from 'clsx';

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={clsx('inline-flex gap-1 rounded-chip bg-surface-2 p-1', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={clsx(
              'relative min-h-9 rounded-chip px-3 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text',
              active ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {active ? (
              <span aria-hidden="true" className="absolute inset-x-2 top-0 h-[3px] rounded-full bg-red" />
            ) : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
