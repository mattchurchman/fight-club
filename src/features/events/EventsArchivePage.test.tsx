// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventsArchivePage } from './EventsArchivePage.tsx';
import type { PastEventRow } from './hooks.ts';

const mockUsePastEvents = vi.fn<(uid: string | null) => PastEventRow[] | undefined>();

vi.mock('../auth/SessionProvider.tsx', () => ({
  useSession: () => ({ user: { uid: 'me' } }),
}));

vi.mock('./hooks.ts', () => ({
  usePastEvents: (uid: string | null) => mockUsePastEvents(uid),
}));

function row(overrides: Partial<PastEventRow> = {}): PastEventRow {
  return {
    id: 'evt1',
    name: 'UFC 300',
    subtitle: null,
    number: 300,
    startsAtMs: 0,
    pot: 500,
    winnerNames: ['Tony'],
    selfRank: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EventsArchivePage />
    </MemoryRouter>,
  );
}

describe('EventsArchivePage', () => {
  it('shows a loading skeleton while rows are undefined', () => {
    mockUsePastEvents.mockReturnValue(undefined);
    const { container } = renderPage();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    expect(screen.queryByText('No past events')).not.toBeInTheDocument();
  });

  it('shows an empty state with no past events', () => {
    mockUsePastEvents.mockReturnValue([]);
    renderPage();
    expect(screen.getByText('No past events')).toBeInTheDocument();
  });

  it('shows the event, its winner, pot and the viewer\'s rank', () => {
    mockUsePastEvents.mockReturnValue([row({ winnerNames: ['Tony'], selfRank: 3, pot: 500 })]);
    renderPage();
    expect(screen.getByText('UFC 300')).toBeInTheDocument();
    expect(screen.getByText('🏆 Tony')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('You #3')).toBeInTheDocument();
  });

  it('joins tied winners with "&" and shows "Didn\'t play" with no entry', () => {
    mockUsePastEvents.mockReturnValue([row({ winnerNames: ['Tony', 'Sam'], selfRank: null })]);
    renderPage();
    expect(screen.getByText('🏆 Tony & Sam')).toBeInTheDocument();
    expect(screen.getByText("Didn't play")).toBeInTheDocument();
  });

  it('links each row to its event', () => {
    mockUsePastEvents.mockReturnValue([row({ id: 'evt42' })]);
    renderPage();
    expect(screen.getByText('UFC 300').closest('a')).toHaveAttribute('href', '/event/evt42');
  });
});
