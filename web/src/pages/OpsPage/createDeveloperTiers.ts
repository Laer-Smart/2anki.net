export interface ProvisionedTier {
  tier_key: string;
  stripe_product_id: string;
  stripe_price_id: string;
  created_product: boolean;
  created_price: boolean;
}

export async function createDeveloperTiers(): Promise<{
  tiers: ProvisionedTier[];
}> {
  const response = await fetch('/api/ops/commands/create-developer-tiers', {
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
