// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YourRow } from './YourRow.tsx';

describe('YourRow', () => {
  it('shows rank and points', () => {
    render(<YourRow rank={4} points={470} move={0} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
    expect(screen.getByText('+470 pts')).toBeInTheDocument();
  });

  it('shows an up arrow for positive movement and a down arrow for negative', () => {
    render(<YourRow rank={1} points={10} move={2} />);
    expect(screen.getByText('▲2')).toBeInTheDocument();

    render(<YourRow rank={5} points={-10} move={-1} />);
    expect(screen.getByText('▼1')).toBeInTheDocument();
    expect(screen.getByText('-10 pts')).toBeInTheDocument();
  });
});
