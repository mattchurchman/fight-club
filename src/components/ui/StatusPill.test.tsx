// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it.each([
    ['scheduled', 'Scheduled'],
    ['open', 'Picks open'],
    ['locked', 'Locked'],
    ['live', 'Live'],
    ['final', 'Final'],
    ['cancelled', 'Cancelled'],
  ] as const)('maps status "%s" to the label "%s"', (status, label) => {
    render(<StatusPill status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
