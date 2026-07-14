export interface MissingPassPayment {
  sessionId: string;
  paymentIntentId: string | null;
  kind: string;
  anonymous: boolean;
  createdAt: string;
  amountTotal: number | null;
  currency: string | null;
}

export interface PassUnlockMonitorResponse {
  window_since: string;
  as_of: string;
  grace_minutes: number;
  checked: number;
  granted: number;
  missing: number;
  pending: number;
  missingPayments: MissingPassPayment[];
  error?: string;
}

export const PASS_UNLOCK_WINDOWS = ['1d', '7d', '14d', '30d'] as const;
export type PassUnlockWindow = (typeof PASS_UNLOCK_WINDOWS)[number];

export async function getPassUnlockMonitor(
  window: PassUnlockWindow
): Promise<PassUnlockMonitorResponse> {
  const response = await fetch(
    `/api/ops/passes/unlock-monitor?window=${window}`,
    { method: 'GET', credentials: 'include' }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.message ?? `${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
