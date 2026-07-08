import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('../backend/getSubscriptionStatus', () => ({
  getSubscriptionStatus: vi.fn(),
}));

import { getSubscriptionStatus } from '../backend/getSubscriptionStatus';
import { useStripeSubscriptions } from './useStripeSubscriptions';

function buildWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const active = {
  id: 'sub_active',
  status: 'active',
  created: 1_700_000_000,
  cancel_at_period_end: false,
  cancel_at: null,
  canceled_at: null,
  current_period_end: 1_800_000_000,
  paused_until: null,
  plan: null,
};

const second = { ...active, id: 'sub_second' };

const canceled = {
  ...active,
  id: 'sub_old',
  status: 'canceled',
};

describe('useStripeSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes only the active subscriptions in activeSubscriptions', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      subscriptions: [active, second, canceled],
    });

    const { result } = renderHook(() => useStripeSubscriptions(true), {
      wrapper: buildWrapper(),
    });

    await waitFor(() =>
      expect(result.current.activeSubscriptions).toHaveLength(2)
    );
    expect(result.current.activeSubscriptions.map((s) => s.id)).toEqual([
      'sub_active',
      'sub_second',
    ]);
  });

  it('keeps the single-sub view for back-compat', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      subscriptions: [active],
    });

    const { result } = renderHook(() => useStripeSubscriptions(true), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => expect(result.current.view.kind).toBe('active'));
    expect(result.current.activeSubscriptions).toHaveLength(1);
  });

  it('derives the paused view when pause_collection is set', async () => {
    vi.mocked(getSubscriptionStatus).mockResolvedValue({
      subscriptions: [{ ...active, paused_until: 1_900_000_000 }],
    });

    const { result } = renderHook(() => useStripeSubscriptions(true), {
      wrapper: buildWrapper(),
    });

    await waitFor(() => expect(result.current.view.kind).toBe('paused'));
  });
});
