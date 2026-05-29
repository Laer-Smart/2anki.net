let lastVerifiedAt: number | null = null;

export function recordStripeWebhook(): void {
  lastVerifiedAt = Date.now();
}

export function getLastStripeWebhookAt(): number | null {
  return lastVerifiedAt;
}
