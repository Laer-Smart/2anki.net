import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ControlsTab from './ControlsTab';

const renderTab = () =>
  render(
    <MemoryRouter>
      <ControlsTab />
    </MemoryRouter>
  );

describe('ControlsTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('stacks the commands, flags, and showcase sections', () => {
    renderTab();

    expect(screen.getByText('Commands')).toBeInTheDocument();
    expect(screen.getByText('Flags')).toBeInTheDocument();
    expect(screen.getByText('Homepage showcase')).toBeInTheDocument();
  });
});
