import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import { ComparisonTable } from './ComparisonTable';

describe('ComparisonTable', () => {
  it('renders a column for every plan', () => {
    render(<ComparisonTable />);
    for (const plan of [
      'Free',
      'Day / Week pass',
      'Unlimited',
      'Auto Sync',
      'Lifetime',
    ]) {
      expect(
        screen.getByRole('columnheader', { name: new RegExp(plan) })
      ).toBeInTheDocument();
    }
  });

  it('shows the free plan card limit and the paid Unlimited value', () => {
    render(<ComparisonTable />);
    expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unlimited').length).toBeGreaterThan(0);
  });

  it('groups rows under category headers including AI', () => {
    render(<ComparisonTable />);
    expect(
      screen.getByRole('columnheader', { name: 'Conversion limits' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'AI (Claude)' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Sync & support' })
    ).toBeInTheDocument();
  });

  it('gates AI multiple choice and AI flashcards to paid tiers', () => {
    render(<ComparisonTable />);
    const mcq = screen.getByRole('row', { name: /AI multiple choice/ });
    expect(within(mcq).getAllByText('Included').length).toBe(4);
    expect(within(mcq).getAllByText('Not included').length).toBe(1);
  });

  it('exposes Auto Sync included/not included state to assistive tech', () => {
    render(<ComparisonTable />);
    const row = screen.getByRole('row', { name: /Auto Sync from Notion/ });
    expect(within(row).getAllByText('Included').length).toBe(2);
    expect(within(row).getAllByText('Not included').length).toBe(3);
  });

  it('shows priority support as a paid-tier differentiator', () => {
    render(<ComparisonTable />);
    const row = screen.getByRole('row', { name: /Priority support/ });
    expect(within(row).getAllByText('Included').length).toBe(3);
    expect(within(row).getAllByText('Not included').length).toBe(2);
  });
});
