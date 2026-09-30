import clsx from 'clsx';
import { Button } from '../../components/ui/Button.tsx';

interface BudgetMeterProps {
  allocated: number;
  budget: number;
  onAutoBalance: () => void;
  onSubmit: () => void;
  submitting: boolean;
  /** The first validation error's message, shown as the Submit button's own label when set. */
  submitDisabledReason: string | null;
}

/** Sticky bar above the tab bar (docs/DESIGN.md "BudgetMeter"): allocated/budget, a progress bar, Auto-balance and Submit. */
export function BudgetMeter({
  allocated,
  budget,
  onAutoBalance,
  onSubmit,
  submitting,
  submitDisabledReason,
}: BudgetMeterProps) {
  const atBudget = allocated === budget;
  const pct = budget > 0 ? Math.min(100, Math.round((allocated / budget) * 100)) : 0;

  return (
    <div className="safe-bottom sticky bottom-16 z-30 flex flex-col gap-2 border-t border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span
          className={clsx(
            'text-sm font-semibold tabular-nums',
            atBudget ? 'text-gold' : 'text-text',
          )}
        >
          Allocated {allocated} / {budget}
        </span>
        <Button
          type="button"
          variant="ghost"
          className="border border-line"
          onClick={onAutoBalance}
        >
          Auto-balance
        </Button>
      </div>
      <div className="h-2 overflow-hidden rounded-chip bg-surface-2">
        <div
          className={clsx('h-full transition-[width]', atBudget ? 'bg-gold' : 'bg-red')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Button
        type="button"
        onClick={onSubmit}
        loading={submitting}
        disabled={submitting || submitDisabledReason !== null}
      >
        {submitDisabledReason ?? 'Submit picks'}
      </Button>
    </div>
  );
}
