import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import TodayTab from './TodayTab';

const mockListContactMessages = vi.fn();

vi.mock('../../lib/backend/get2ankiApi', () => ({
  get2ankiApi: () => ({
    listContactMessages: mockListContactMessages,
  }),
}));

const healthyBusiness = {
  mrr_usd: 1823,
  net_new_mrr_mtd_usd: 40,
  active_paying_subs: 759,
  churn_30d_pct: 18.2,
  failed_payments_7d: 3,
  new_paid_conversions_7d: 16,
  mrr_timeseries: null,
  active_subs_timeseries: null,
  conversions_vs_churn_weekly: null,
  failed_payments_weekly: [
    { week: '2026-06-01', count: 2 },
    { week: '2026-06-08', count: 2 },
    { week: '2026-06-15', count: 2 },
    { week: '2026-06-22', count: 2 },
  ],
  cancellation_reasons_top: null,
  cancellation_comments_recent: [],
  emoji_feedback_ratings: null,
  emoji_feedback_comments: null,
  reengagement_reasons_top: null,
  reengagement_comments_recent: null,
  signup_countries_90d: null,
  as_of: '2026-07-06T00:00:00Z',
  cache_age_seconds: 5,
};

const healthyConversion = {
  free_conversions_7d: 824,
  paid_conversions_7d: 137,
  free_conversion_success_rate_7d: 96.4,
  paid_conversion_success_rate_7d: 97.2,
  free_blocked_by_plan_7d: 40,
  paid_blocked_by_plan_7d: 0,
  conversion_errors_7d_top_reasons: null,
  failed_conversions_weekly: null,
  time_to_first_deck_median_minutes_30d: 42,
  upload_to_download_rate_7d: 25.4,
};

const healthyPerformance = {
  generated_at: '2026-07-06T00:00:00Z',
  durations: [
    { window: '24h', p50_ms: 800, p95_ms: 4200, p99_ms: 9000, count: 100 },
  ],
  status_breakdown_24h: [],
  slowest_jobs_24h: [],
  signup_countries_7d: [],
};

const healthyReturnRate = {
  overall: { '7d': 32.1, '14d': 40, '30d': 45 },
  by_source_type: null,
  as_of: '2026-07-06T00:00:00Z',
};

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
  text: async () => JSON.stringify(body),
});

interface RouteOverrides {
  errorGroups?: unknown;
  business?: unknown;
}

const installFetch = (overrides: RouteOverrides = {}) => {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/ops/errors')) {
      return Promise.resolve(
        jsonResponse(overrides.errorGroups ?? { groups: [], totalGroups: 0 })
      );
    }
    if (url.includes('/api/ops/business/metrics')) {
      return Promise.resolve(
        jsonResponse(overrides.business ?? healthyBusiness)
      );
    }
    if (url.includes('/api/ops/conversion/metrics')) {
      return Promise.resolve(jsonResponse(healthyConversion));
    }
    if (url.includes('/api/ops/performance/metrics')) {
      return Promise.resolve(jsonResponse(healthyPerformance));
    }
    if (url.includes('/api/ops/return-rate/metrics')) {
      return Promise.resolve(jsonResponse(healthyReturnRate));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  }) as unknown as typeof fetch;
};

const renderTab = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TodayTab />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TodayTab', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockListContactMessages.mockResolvedValue([]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  test('shows the calm empty state when no rule fires', async () => {
    installFetch();
    renderTab();

    expect(
      await screen.findByText('Nothing needs you today.')
    ).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  test('renders an attention row with a copy button when errors are unresolved', async () => {
    installFetch({
      errorGroups: {
        groups: [
          {
            message_hash: 'abc',
            message: 'TypeError: x is undefined',
            stack: null,
            url: null,
            release: null,
            source: 'server',
            user_id: null,
            user_agent: null,
            first_seen: '2026-07-01T00:00:00Z',
            last_seen: '2026-07-06T00:00:00Z',
            occurrences: 7,
            resolved: false,
            resolved_at: null,
          },
        ],
        totalGroups: 1,
      },
    });
    renderTab();

    expect(
      await screen.findByText('Unresolved error groups')
    ).toBeInTheDocument();
    expect(screen.getByText('7 occurrences')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy for Claude Code' })
    ).toBeInTheDocument();
  });

  it('shows recent emoji feedback comments in the voice block', async () => {
    installFetch({
      business: {
        ...healthyBusiness,
        emoji_feedback_comments: [
          {
            rating: 2,
            comment: 'The deck came out empty',
            page: '/upload',
            created_at: '2026-07-08T09:00:00Z',
          },
        ],
      },
    });
    renderTab();

    expect(
      await screen.findByText(/The deck came out empty/)
    ).toBeInTheDocument();
  });
});
