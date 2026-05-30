import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import UploadFunnelTab, { formatCount, formatRate } from './UploadFunnelTab';
import { UploadFunnelResponse } from './uploadFunnelTypes';

const THIN_SPACE = '\u2009';

const spaceNormalizer = (text: string) =>
  text.replace(/[\u2009\u202f]/g, ' ').trim();

const mockFetch = (payload: UploadFunnelResponse) => {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  });
};

describe('formatCount', () => {
  test('renders counts under 10 000 without a separator', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(9999)).toBe('9999');
  });

  test('uses a thin space, not a comma, at and above 10 000', () => {
    expect(formatCount(10000)).toBe(`10${THIN_SPACE}000`);
    expect(formatCount(1200000)).toBe(`1${THIN_SPACE}200${THIN_SPACE}000`);
    expect(formatCount(1200000)).not.toContain(',');
  });
});

describe('formatRate', () => {
  test('renders one decimal with a percent sign', () => {
    expect(formatRate(42.7)).toBe('42.7%');
    expect(formatRate(0)).toBe('0.0%');
  });
});

describe('UploadFunnelTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test('renders the four stage counts and the rate hero', async () => {
    mockFetch({
      stages: {
        upload_started: 12450,
        conversion_succeeded: 11200,
        conversion_failed: 320,
        deck_downloaded: 10300,
      },
      upload_to_download_rate_pct: 57.83,
      since: '2026-05-01T00:00:00.000Z',
      as_of: '2026-05-30T00:00:00.000Z',
    });

    render(<UploadFunnelTab />);

    await waitFor(() =>
      expect(
        screen.getByText('12 450', { normalizer: spaceNormalizer })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByText('11 200', { normalizer: spaceNormalizer })
    ).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(
      screen.getByText('10 300', { normalizer: spaceNormalizer })
    ).toBeInTheDocument();
    expect(screen.getByText('57.8%')).toBeInTheDocument();
    expect(screen.getByText('Conversion failed')).toBeInTheDocument();
  });

  test('shows the zero state and an honest 0% rate when there are no uploads', async () => {
    mockFetch({
      stages: {
        upload_started: 0,
        conversion_succeeded: 0,
        conversion_failed: 0,
        deck_downloaded: 0,
      },
      upload_to_download_rate_pct: 0,
      since: '2026-05-01T00:00:00.000Z',
      as_of: '2026-05-30T00:00:00.000Z',
    });

    render(<UploadFunnelTab />);

    await waitFor(() =>
      expect(screen.getByText('No uploads in this window')).toBeInTheDocument()
    );
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  test('renders the server error message in the danger banner', async () => {
    mockFetch({
      stages: null,
      upload_to_download_rate_pct: 0,
      since: '2026-05-01T00:00:00.000Z',
      as_of: '2026-05-30T00:00:00.000Z',
      error: 'relation "events" does not exist',
    });

    render(<UploadFunnelTab />);

    await waitFor(() =>
      expect(
        screen.getByText('relation "events" does not exist')
      ).toBeInTheDocument()
    );
    expect(screen.queryByText('No uploads in this window')).toBeNull();
  });
});
