// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FighterPanel } from './FighterPanel.tsx';

const fighter = {
  fighterId: 'ftr_a',
  name: 'Alexandre Pantoja',
  record: '28-5-0',
  headshotUrl: null,
};

describe('FighterPanel', () => {
  it('calls onSelect when tapped', () => {
    const onSelect = vi.fn();
    render(
      <FighterPanel
        fighter={fighter}
        odds={-150}
        picked={false}
        dimmed={false}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pick Alexandre Pantoja' }));
    expect(onSelect).toHaveBeenCalled();
  });

  it('splits the surname into the display-font line', () => {
    render(
      <FighterPanel
        fighter={fighter}
        odds={-150}
        picked={false}
        dimmed={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Pantoja')).toBeInTheDocument();
    expect(screen.getByText('Alexandre')).toBeInTheDocument();
  });

  it('shows "Your pick" only when picked', () => {
    render(
      <FighterPanel
        fighter={fighter}
        odds={-150}
        picked={false}
        dimmed={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText('✓ Your pick')).not.toBeInTheDocument();
  });

  it('shows the pick label and aria-pressed once picked', () => {
    render(
      <FighterPanel
        fighter={fighter}
        odds={-150}
        picked={true}
        dimmed={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('✓ Your pick')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick Alexandre Pantoja' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('dims when the other corner is picked', () => {
    render(
      <FighterPanel
        fighter={fighter}
        odds={-150}
        picked={false}
        dimmed={true}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Pick Alexandre Pantoja' })).toHaveClass(
      'opacity-40',
    );
  });

  it('shows a placeholder when odds are not set', () => {
    render(
      <FighterPanel
        fighter={fighter}
        odds={null}
        picked={false}
        dimmed={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
