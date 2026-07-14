import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import CustomerSignalsTab from './CustomerSignalsTab';
import { CustomerSignalsResponse } from './customerSignalsTypes';

const mockFetch = (payload: CustomerSignalsResponse) => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  });
};

describe('CustomerSignalsTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('renders a ranked row per signal with source, count, and bucket', async () => {
    mockFetch({
      signals: [
        {
          source: 'failed_conversion',
          label: 'Notion export unreadable',
          count: 12450,
          bucket: 'pain-killer',
        },
        {
          source: 'cancel_reason',
          label: 'finished what I needed',
          count: 9,
          bucket: 'unknown',
        },
      ],
      since: '2026-06-01T00:00:00.000Z',
      as_of: '2026-06-30T00:00:00.000Z',
    });

    render(<CustomerSignalsTab />);

    await waitFor(() =>
      expect(screen.getByText('Notion export unreadable')).toBeInTheDocument()
    );
    expect(screen.getByText('Failed conversion')).toBeInTheDocument();
    expect(screen.getByText('12 450')).toBeInTheDocument();
    expect(screen.getByText('Pain killer')).toBeInTheDocument();
    expect(screen.getByText('finished what I needed')).toBeInTheDocument();
  });

  test('shows the verbatim sample quote for free-text sources', async () => {
    mockFetch({
      signals: [
        {
          source: 'cancel_comment',
          label: 'too expensive',
          count: 1,
          bucket: 'unknown',
          sampleQuote: 'wish it were cheaper for students',
        },
      ],
      since: '2026-06-01T00:00:00.000Z',
      as_of: '2026-06-30T00:00:00.000Z',
    });

    render(<CustomerSignalsTab />);

    await waitFor(() =>
      expect(
        screen.getByText('wish it were cheaper for students')
      ).toBeInTheDocument()
    );
    expect(screen.getByText('Cancellation comment')).toBeInTheDocument();
  });

  test('shows the empty state when there is no signal', async () => {
    mockFetch({
      signals: [],
      since: '2026-06-01T00:00:00.000Z',
      as_of: '2026-06-30T00:00:00.000Z',
    });

    render(<CustomerSignalsTab />);

    await waitFor(() =>
      expect(
        screen.getByText('No customer signal in this window yet.')
      ).toBeInTheDocument()
    );
  });

  test('renders the server error message in the danger banner', async () => {
    mockFetch({
      signals: null,
      since: '2026-06-01T00:00:00.000Z',
      as_of: '2026-06-30T00:00:00.000Z',
      error: 'relation "cancellation_feedback" does not exist',
    });

    render(<CustomerSignalsTab />);

    await waitFor(() =>
      expect(
        screen.getByText('relation "cancellation_feedback" does not exist')
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByText('No customer signal in this window yet.')
    ).toBeNull();
  });
});
