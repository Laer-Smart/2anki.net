import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ErrorsTab from './ErrorsTab';

describe('ErrorsTab download for Claude', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ groups: [], totalGroups: 0 }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('renders a download link pointing at the export endpoint', async () => {
    render(
      <MemoryRouter>
        <ErrorsTab />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', {
      name: 'Download for Claude',
    });
    expect(link).toHaveAttribute(
      'href',
      '/api/ops/errors/export?status=unresolved'
    );
  });

  test('the download link carries the active filters', async () => {
    render(
      <MemoryRouter initialEntries={['/ops/errors?status=resolved&source=server']}>
        <ErrorsTab />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', {
      name: 'Download for Claude',
    });
    expect(link).toHaveAttribute(
      'href',
      '/api/ops/errors/export?status=resolved&source=server'
    );
  });
});
