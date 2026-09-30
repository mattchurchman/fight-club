// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BudgetMeter } from './BudgetMeter.tsx';

describe('BudgetMeter', () => {
  it('shows the first validation error as the Submit button label, disabled', () => {
    render(
      <BudgetMeter
        allocated={800}
        budget={1000}
        onAutoBalance={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        submitDisabledReason="Stake exactly 1000 points — you have staked 800."
      />,
    );
    const button = screen.getByRole('button', { name: 'Stake exactly 1000 points — you have staked 800.' });
    expect(button).toBeDisabled();
  });

  it('enables Submit once every error clears', () => {
    const onSubmit = vi.fn();
    render(
      <BudgetMeter
        allocated={1000}
        budget={1000}
        onAutoBalance={vi.fn()}
        onSubmit={onSubmit}
        submitting={false}
        submitDisabledReason={null}
      />,
    );
    const button = screen.getByRole('button', { name: 'Submit picks' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('calls onAutoBalance when tapped', () => {
    const onAutoBalance = vi.fn();
    render(
      <BudgetMeter
        allocated={0}
        budget={1000}
        onAutoBalance={onAutoBalance}
        onSubmit={vi.fn()}
        submitting={false}
        submitDisabledReason="Choose one bout as your Lock of the Night."
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Auto-balance' }));
    expect(onAutoBalance).toHaveBeenCalled();
  });

  it('shows the allocated/budget total', () => {
    render(
      <BudgetMeter
        allocated={650}
        budget={1000}
        onAutoBalance={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        submitDisabledReason="Stake exactly 1000 points — you have staked 650."
      />,
    );
    expect(screen.getByText('Allocated 650 / 1000')).toBeInTheDocument();
  });
});
