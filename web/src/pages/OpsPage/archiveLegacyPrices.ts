export type ArchiveLegacyPriceAction =
  | 'would_archive'
  | 'archived'
  | 'already_archived'
  | 'skipped_missing_env'
  | 'skipped_guard';

export interface ArchiveLegacyPriceResult {
  priceId: string;
  lookupKey: string | null;
  unitAmount: number | null;
  interval: string | null;
  active: boolean | null;
  action: ArchiveLegacyPriceAction;
}

export interface ArchiveLegacyPricesResponse {
  livemode: boolean;
  prices: ArchiveLegacyPriceResult[];
}

export async function archiveLegacyPrices(
  dryRun: boolean
): Promise<ArchiveLegacyPricesResponse> {
  const response = await fetch('/api/ops/archive-legacy-prices', {
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
