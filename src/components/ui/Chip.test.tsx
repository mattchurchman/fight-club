// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('reflects the selected state via aria-pressed', () => {
    render(<Chip selected>KO/TKO</Chip>);
    expect(screen.getByRole('button', { name: 'KO/TKO' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(
      <Chip selected={false} onSelect={onSelect}>
        SUB
      </Chip>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SUB' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
