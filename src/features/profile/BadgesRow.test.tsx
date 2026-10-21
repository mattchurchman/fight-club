// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../../components/ui/Toast.tsx';
import { BadgesRow } from './BadgesRow.tsx';

function renderWithToast(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('BadgesRow', () => {
  it('shows a ×N chip for a count of 3', () => {
    renderWithToast(<BadgesRow earned={['champion']} counts={{ champion: 3 }} />);
    expect(screen.getByText('×3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Champion, earned 3 times' })).toBeInTheDocument();
  });

  it('shows no chip for a count of 1', () => {
    renderWithToast(<BadgesRow earned={['champion']} counts={{ champion: 1 }} />);
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it('caps the chip at ×99', () => {
    renderWithToast(<BadgesRow earned={['champion']} counts={{ champion: 150 }} />);
    expect(screen.getByText('×99')).toBeInTheDocument();
  });

  it('sorts earned badges before locked ones, preserving definition order within each group', () => {
    renderWithToast(<BadgesRow earned={['bleeder']} counts={{ bleeder: 1 }} />);
    const names = screen
      .getAllByRole('button')
      .map((button) => button.querySelector('span:not([aria-hidden])')?.textContent);
    expect(names[0]).toBe('Bleeder');
  });
});
