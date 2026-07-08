import { useQuery } from '@tanstack/react-query';
import {
  getSubscriptionStatus,
  StripeSubscriptionSummary,
} from '../backend/getSubscriptionStatus';

export type SubscriptionViewState =
  | { kind: 'none' }
  | { kind: 'active'; subscription: StripeSubscriptionSummary }
  | { kind: 'scheduled'; subscription: StripeSubscriptionSummary }
  | { kind: 'paused'; subscription: StripeSubscriptionSummary }
  | { kind: 'cancelled'; subscription: StripeSubscriptionSummary };

export interface StripeSubscriptionsState {
  subscriptions: StripeSubscriptionSummary[];
  activeSubscriptions: StripeSubscriptionSummary[];
  view: SubscriptionViewState;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

function deriveView(
  subscriptions: StripeSubscriptionSummary[]
): SubscriptionViewState {
  const active = subscriptions.find((sub) => sub.status === 'active');
  if (active) {
    if (active.paused_until != null) {
      return { kind: 'paused', subscription: active };
    }
    return active.cancel_at_period_end
      ? { kind: 'scheduled', subscription: active }
      : { kind: 'active', subscription: active };
  }

  const cancelled = subscriptions.find((sub) => sub.status === 'canceled');
  if (cancelled) {
    return { kind: 'cancelled', subscription: cancelled };
  }

  return { kind: 'none' };
}

export function useStripeSubscriptions(
  enabled: boolean
): StripeSubscriptionsState {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stripeSubscriptions'],
    queryFn: getSubscriptionStatus,
    enabled,
    staleTime: 15_000,
  });

  const subscriptions = data?.subscriptions ?? [];
  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === 'active'
  );

  return {
    subscriptions,
    activeSubscriptions,
    view: deriveView(subscriptions),
    isLoading,
    refetch,
  };
}
