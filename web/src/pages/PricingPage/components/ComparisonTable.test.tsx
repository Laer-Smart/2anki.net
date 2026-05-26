import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import { ComparisonTable } from './ComparisonTable';

describe('ComparisonTable', () => {
  it('renders a column for every plan', () => {
    render(<ComparisonTable />);
    for (const plan of ['Free', 'Day / Week pass', 'Unlimited', 'Auto Sync', 'Lifetime']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(plan) })).toBeInTheDocument();
    }
  });

  it('shows the free plan card limit and the paid Unlimited value', () => {
    render(<ComparisonTable />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
  });

  it('groups rows under category headers', () => {
    render(<ComparisonTable />);
    expect(screen.getByRole('columnheader', { name: 'Usage' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Notion sync' })).toBeInTheDocument();
  });

  it('marks Auto Sync as the row label and exposes included/not included to assistive tech', () => {
    render(<ComparisonTable />);
    const row = screen.getByRole('row', { name: /Auto Sync every 5 minutes/ });
    expect(within(row).getAllByText('Included').length).toBe(2);
    expect(within(row).getAllByText('Not included').length).toBe(3);
  });
});
