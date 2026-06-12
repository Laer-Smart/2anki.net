export interface OrphanedSubscription {
  id: number;
  email: string;
  stripeProductId: string | null;
  createdAt: string | null;
  customerId: string | null;
}

export interface OrphanedSubscriptionsResponse {
  count: number;
  orphans: OrphanedSubscription[];
}

export interface ReconcileOrphanedSubscriptionsResponse {
  found: number;
  emailed: number;
  skippedRecentlyNotified: number;
  skippedNoEmail: number;
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

export async function getOrphanedSubscriptions(): Promise<OrphanedSubscriptionsResponse> {
  const response = await fetch('/api/ops/subscriptions/orphaned', {
    method: 'GET',
    credentials: 'include',
  });
  return parseOrThrow<OrphanedSubscriptionsResponse>(response);
}

export async function reconcileOrphanedSubscriptions(): Promise<ReconcileOrphanedSubscriptionsResponse> {
  const response = await fetch('/api/ops/subscriptions/reconcile', {
    method: 'POST',
    credentials: 'include',
  });
  return parseOrThrow<ReconcileOrphanedSubscriptionsResponse>(response);
}
