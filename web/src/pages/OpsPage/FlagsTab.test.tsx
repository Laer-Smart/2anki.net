import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import FlagsTab from './FlagsTab';

const sampleFlag = {
  key: 'ai-converter-floor-v1',
  value: false,
  description: 'AI converter floor canary',
  updated_at: '2026-05-29T10:00:00.000Z',
  updated_by_email: 'alex@example.com',
};

describe('FlagsTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('renders the flag key, description, and current value from the response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [sampleFlag],
    });

    render(<FlagsTab />);

    await waitFor(() =>
      expect(screen.getByText('ai-converter-floor-v1')).toBeInTheDocument()
    );
    expect(screen.getByText('AI converter floor canary')).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Toggle ai-converter-floor-v1' })
    ).not.toBeChecked();
  });

  test('toggling the switch fires a PUT and reflects the new value', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [sampleFlag],
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...sampleFlag, value: true }),
    });

    render(<FlagsTab />);

    const toggle = await screen.findByRole('switch', {
      name: 'Toggle ai-converter-floor-v1',
    });
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Toggle ai-converter-floor-v1' })
      ).toBeChecked()
    );

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/ops/flags/ai-converter-floor-v1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ value: true }),
      })
    );
  });

  test('rolls back the toggle and surfaces the error when the PUT fails', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [sampleFlag],
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Update failed: server' }),
    });

    render(<FlagsTab />);

    const toggle = await screen.findByRole('switch', {
      name: 'Toggle ai-converter-floor-v1',
    });
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(screen.getByText(/Update failed: server/i)).toBeInTheDocument()
    );

    expect(
      screen.getByRole('switch', { name: 'Toggle ai-converter-floor-v1' })
    ).not.toBeChecked();
  });

  test('renders an error banner when the initial load fails', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    render(<FlagsTab />);

    await waitFor(() =>
      expect(screen.getByText(/\/api\/ops\/flags failed/i)).toBeInTheDocument()
    );
  });
});
