export type PricingV2PriceStatus = 'created' | 'already_exists';

export interface PricingV2PriceResult {
  lookupKey: string;
  status: PricingV2PriceStatus;
  priceId: string;
  unitAmount: number;
  interval: 'month' | 'year';
}

export interface CreatePricingV2PricesResponse {
  livemode: boolean;
  prices: PricingV2PriceResult[];
}

export async function createPricingV2Prices(): Promise<CreatePricingV2PricesResponse> {
  const response = await fetch('/api/ops/create-pricing-v2-prices', {
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
