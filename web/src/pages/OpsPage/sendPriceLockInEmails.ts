export interface SendPriceLockInEmailsResponse {
  count: number;
  skipped: number;
  dryRun: boolean;
  variantA: number;
  variantB: number;
}

export async function sendPriceLockInEmails(
  dryRun: boolean
): Promise<SendPriceLockInEmailsResponse> {
  const response = await fetch('/api/ops/send-price-lock-in-emails', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
