// @vitest-environment jsdom
import type { Timestamp } from 'firebase/firestore';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WhosIn } from './WhosIn.tsx';
import type { EntrantWithId } from './hooks.ts';

const ts = (ms: number) => ({ toMillis: () => ms }) as unknown as Timestamp;

function entrant(overrides: Partial<EntrantWithId> = {}): EntrantWithId {
  return {
    id: 'u1',
    uid: 'u1',
    displayName: 'Matt Churchman',
    photoURL: null,
    submittedAt: ts(1),
    ...overrides,
  };
}

function renderWhosIn(props: Partial<Parameters<typeof WhosIn>[0]> = {}) {
  return render(
    <MemoryRouter>
      <WhosIn entrants={[]} selfUid={null} usernameByUid={{}} {...props} />
    </MemoryRouter>,
  );
}

describe('WhosIn', () => {
  it('shows the count and first names in order', () => {
    renderWhosIn({
      entrants: [
        entrant({ id: 'u1', uid: 'u1', displayName: 'Matt Churchman', submittedAt: ts(1) }),
        entrant({ id: 'u2', uid: 'u2', displayName: 'Tony Soldic', submittedAt: ts(2) }),
      ],
    });
    expect(screen.getByText(/WHO.S IN . 2/)).toBeInTheDocument();
    const names = screen.getAllByText(/Matt|Tony/).map((el) => el.textContent);
    expect(names).toEqual(['Matt', 'Tony']);
  });

  it("marks the viewer's own avatar", () => {
    renderWhosIn({
      entrants: [entrant({ id: 'u1', uid: 'u1', displayName: 'Matt Churchman' })],
      selfUid: 'u1',
      usernameByUid: { u1: 'matty' },
    });
    const link = screen.getByLabelText("View Matt Churchman's profile", { exact: false });
    expect(link.querySelector('.ring-text')).toBeInTheDocument();
  });

  it('links each entrant to their profile when a username is known', () => {
    renderWhosIn({
      entrants: [entrant({ id: 'u1', uid: 'u1', displayName: 'Matt Churchman' })],
      usernameByUid: { u1: 'matty' },
    });
    expect(screen.getByLabelText("View Matt Churchman's profile")).toHaveAttribute('href', '/u/matty');
  });

  it('shows an empty state with a "Make picks" link when the viewer has no entry', () => {
    renderWhosIn({ entrants: [], selfUid: null });
    expect(screen.getByText("Nobody's in yet")).toBeInTheDocument();
    expect(screen.getByText('Make picks')).toHaveAttribute('href', '/');
  });

  it('hides the "Make picks" link once the viewer has an entry (non-empty entrants)', () => {
    renderWhosIn({
      entrants: [entrant({ id: 'u1', uid: 'u1' })],
      selfUid: 'u1',
    });
    expect(screen.queryByText("Nobody's in yet")).not.toBeInTheDocument();
    expect(screen.queryByText('Make picks')).not.toBeInTheDocument();
  });
});
