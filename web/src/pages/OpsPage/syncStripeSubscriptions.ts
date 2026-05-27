export async function syncStripeSubscriptions(): Promise<{ message: string }> {
  const response = await fetch('/api/ops/sync-stripe-subscriptions', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
