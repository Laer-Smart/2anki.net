import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import PassUnlockMonitorTab from './PassUnlockMonitorTab';
import { PassUnlockMonitorResponse } from './passUnlockMonitor';

const mockFetch = (payload: PassUnlockMonitorResponse) => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  });
};

const baseResponse: PassUnlockMonitorResponse = {
  window_since: '2026-07-07T12:00:00.000Z',
  as_of: '2026-07-14T12:00:00.000Z',
  grace_minutes: 15,
  checked: 0,
  granted: 0,
  missing: 0,
  pending: 0,
  missingPayments: [],
};

describe('PassUnlockMonitorTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('lists each paid-but-unlocked missing payment after a check', async () => {
    mockFetch({
      ...baseResponse,
      checked: 2,
      granted: 1,
      missing: 1,
      missingPayments: [
        {
          sessionId: 'cs_missing',
          paymentIntentId: 'pi_missing',
          kind: '7d',
          anonymous: false,
          createdAt: '2026-07-10T12:00:00.000Z',
          amountTotal: 199,
          currency: 'usd',
        },
      ],
    });

    render(<PassUnlockMonitorTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Check passes' }));

    await waitFor(() =>
      expect(screen.getByText('cs_missing')).toBeInTheDocument()
    );
    expect(screen.getByText('pi_missing')).toBeInTheDocument();
    const row = screen.getByText('cs_missing').closest('tr');
    expect(row).toHaveTextContent('7d');
    expect(row).toHaveTextContent('Account');
    expect(screen.getByText(/1 missing/, { exact: false })).toBeInTheDocument();
  });

  test('reports a clean check with no missing table', async () => {
    mockFetch({
      ...baseResponse,
      checked: 5,
      granted: 5,
      missing: 0,
    });

    render(<PassUnlockMonitorTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Check passes' }));

    await waitFor(() =>
      expect(
        screen.getByText(/5 completed pass payments checked/)
      ).toBeInTheDocument()
    );
    expect(screen.queryByText('Session')).not.toBeInTheDocument();
  });

  test('surfaces a Stripe error returned in the payload', async () => {
    mockFetch({ ...baseResponse, error: 'stripe down' });

    render(<PassUnlockMonitorTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Check passes' }));

    await waitFor(() =>
      expect(screen.getByText('stripe down')).toBeInTheDocument()
    );
  });

  test('surfaces a failed request', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Failed to load pass unlock monitor' }),
    });

    render(<PassUnlockMonitorTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Check passes' }));

    await waitFor(() =>
      expect(
        screen.getByText('Failed to load pass unlock monitor')
      ).toBeInTheDocument()
    );
  });
});
