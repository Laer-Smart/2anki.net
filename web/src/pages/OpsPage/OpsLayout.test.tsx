import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, test } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import OpsLayout from './OpsLayout';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ops" element={<OpsLayout />}>
          <Route index element={<div data-testid="engineering">eng</div>} />
          <Route
            path="business"
            element={<div data-testid="business">biz</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('OpsLayout', () => {
  test('renders the Ops heading and the active section breadcrumb', () => {
    renderAt('/ops');
    expect(screen.getByRole('heading', { name: 'Ops' })).toBeInTheDocument();
    const section = screen.getByText('System');
    expect(section).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('engineering')).toBeInTheDocument();
  });

  test('shows the Business section name on /ops/business', () => {
    renderAt('/ops/business');
    expect(screen.getByText('Business')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.queryByText('System')).not.toBeInTheDocument();
    expect(screen.getByTestId('business')).toBeInTheDocument();
  });

  test('no longer renders an in-page tab bar', () => {
    renderAt('/ops');
    expect(
      screen.queryByRole('link', { name: 'Business' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Ops sections' })
    ).not.toBeInTheDocument();
  });
});
