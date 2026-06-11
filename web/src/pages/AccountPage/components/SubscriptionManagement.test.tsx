import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { SubscriptionManagement } from './SubscriptionManagement';
import type { StripeSubscriptionsState } from '../../../lib/hooks/useStripeSubscriptions';

vi.mock('../../../lib/hooks/useStripeSubscriptions', () => ({
  useStripeSubscriptions: vi.fn(),
}));

import { useStripeSubscriptions } from '../../../lib/hooks/useStripeSubscriptions';

const mockUseStripeSubscriptions =
  useStripeSubscriptions as unknown as ReturnType<typeof vi.fn>;

const user = { email: 'learner@example.com', name: 'Learner' };

function withQueryClient(ui: ReactNode) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

function stubStripeActive(plan?: {
  amount: number | null;
  currency: string | null;
  interval: string | null;
}) {
  mockUseStripeSubscriptions.mockReturnValue({
    subscriptions: [],
    view: {
      kind: 'active',
      subscription: {
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1893456000,
        cancel_at: null,
        canceled_at: null,
        plan: plan ?? { amount: 1000, currency: 'usd', interval: 'month' },
      },
    },
    isLoading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  } as unknown as StripeSubscriptionsState);
}

function renderStripeManagement() {
  return render(
    withQueryClient(
      <SubscriptionManagement
        user={user}
        locals={{ subscriber: true, planSource: 'stripe' }}
        hasActivePlan
        onRefetch={vi.fn().mockResolvedValue(undefined)}
      />
    )
  );
}

describe('SubscriptionManagement', () => {
  beforeEach(() => {
    mockUseStripeSubscriptions.mockReset();
  });

  it("shows Apple management copy and no Stripe controls for planSource 'apple'", () => {
    render(
      <SubscriptionManagement
        user={user}
        locals={{ subscriber: true, planSource: 'apple' }}
        hasActivePlan
        onRefetch={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Billed through Apple/)).toBeTruthy();
    expect(screen.getByText(/Apple Account settings/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cancel at period end' })
    ).toBeNull();
    expect(screen.queryByLabelText('Subscription email')).toBeNull();
    expect(mockUseStripeSubscriptions).not.toHaveBeenCalled();
  });

  it("shows lifetime copy and no controls for planSource 'lifetime'", () => {
    render(
      <SubscriptionManagement
        user={user}
        locals={{ subscriber: true, planSource: 'lifetime' }}
        hasActivePlan
        onRefetch={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/Lifetime access/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Cancel at period end' })
    ).toBeNull();
    expect(screen.queryByLabelText('Subscription email')).toBeNull();
    expect(mockUseStripeSubscriptions).not.toHaveBeenCalled();
  });

  it("renders the existing Stripe controls for planSource 'stripe'", () => {
    stubStripeActive();

    render(
      withQueryClient(
        <SubscriptionManagement
          user={user}
          locals={{ subscriber: true, planSource: 'stripe' }}
          hasActivePlan
          onRefetch={vi.fn().mockResolvedValue(undefined)}
        />
      )
    );

    expect(
      screen.getByRole('button', { name: 'Cancel at period end' })
    ).toBeTruthy();
    expect(mockUseStripeSubscriptions).toHaveBeenCalledWith(true);
  });

  it('renders existing Stripe controls when planSource is unset (safe default)', () => {
    stubStripeActive();

    render(
      withQueryClient(
        <SubscriptionManagement
          user={user}
          locals={{ subscriber: true }}
          hasActivePlan
          onRefetch={vi.fn().mockResolvedValue(undefined)}
        />
      )
    );

    expect(
      screen.getByRole('button', { name: 'Cancel at period end' })
    ).toBeTruthy();
    expect(mockUseStripeSubscriptions).toHaveBeenCalledWith(true);
  });

  it.each([
    ['legacy monthly $6', { amount: 600, interval: 'month' }],
    ['legacy yearly $60', { amount: 6000, interval: 'year' }],
    ['unknown interval below monthly v2', { amount: 600, interval: null }],
  ])('shows the legacy-rate note for %s', (_label, plan) => {
    stubStripeActive({ currency: 'usd', ...plan });

    renderStripeManagement();

    expect(
      screen.getByText('Cancelling forfeits this legacy rate.')
    ).toBeTruthy();
  });

  it.each([
    ['v2 monthly $7.99', { amount: 799, interval: 'month' }],
    ['v2 yearly $64', { amount: 6400, interval: 'year' }],
  ])('hides the legacy-rate note for %s', (_label, plan) => {
    stubStripeActive({ currency: 'usd', ...plan });

    renderStripeManagement();

    expect(
      screen.queryByText('Cancelling forfeits this legacy rate.')
    ).toBeNull();
  });

  it('renders nothing when the user is not a subscriber', () => {
    const { container } = render(
      <SubscriptionManagement
        user={user}
        locals={{ subscriber: false }}
        hasActivePlan={false}
        onRefetch={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockUseStripeSubscriptions).not.toHaveBeenCalled();
  });
});
