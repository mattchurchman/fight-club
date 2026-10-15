// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DeckTopBar } from './DeckTopBar.tsx';

function renderBar(overrides: Partial<Parameters<typeof DeckTopBar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <DeckTopBar
        eventId="evt_1"
        activeIndex={0}
        fightsCount={2}
        fightComplete={[false, false]}
        allocated={0}
        budget={1000}
        attemptedSubmit={false}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('DeckTopBar', () => {
  it('shows "Fight n / N" while on a fight slide', () => {
    renderBar();
    expect(screen.getByText('Fight 1 / 2')).toBeInTheDocument();
  });

  it('shows "Review" once past the last fight', () => {
    renderBar({ activeIndex: 2 });
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('marks a budget met with a checkmark', () => {
    renderBar({ allocated: 1000 });
    expect(screen.getByText('1000 / 1000 ✓')).toBeInTheDocument();
  });

  it('adds no red dots before a submit attempt', () => {
    const { container } = renderBar({ fightComplete: [false, true] });
    expect(container.querySelectorAll('.bg-red-text')).toHaveLength(0);
  });

  it('adds a red dot to each incomplete segment once attemptedSubmit is true', () => {
    const { container } = renderBar({ attemptedSubmit: true, fightComplete: [false, true] });
    expect(container.querySelectorAll('.bg-red-text')).toHaveLength(1);
  });
});
