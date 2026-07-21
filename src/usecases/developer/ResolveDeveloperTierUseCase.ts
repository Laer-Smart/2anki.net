import type {
  DeveloperTierRow,
  IDeveloperTiersRepository,
} from '../../data_layer/DeveloperTiersRepository';

export interface ResolvedDeveloperTier {
  tier_key: string;
  monthly_card_limit: number;
  requests_per_minute: number;
}

export const SANDBOX_TIER: ResolvedDeveloperTier = {
  tier_key: 'sandbox',
  monthly_card_limit: 100,
  requests_per_minute: 5,
};

export const LIFETIME_TIER: ResolvedDeveloperTier = {
  tier_key: 'lifetime',
  monthly_card_limit: Number.POSITIVE_INFINITY,
  requests_per_minute: 60,
};

export interface TierLookupInput {
  patreon: boolean;
  activeProductIds: string[];
}

export class ResolveDeveloperTierUseCase {
  constructor(private readonly tiers: IDeveloperTiersRepository) {}

  async execute(input: TierLookupInput): Promise<ResolvedDeveloperTier> {
    if (input.patreon) {
      return LIFETIME_TIER;
    }
    const active = await this.tiers.listActive();
    const owned = active.filter((tier: DeveloperTierRow) =>
      input.activeProductIds.includes(tier.stripe_product_id)
    );
    if (owned.length === 0) {
      return SANDBOX_TIER;
    }
    const best = owned.reduce((a, b) =>
      b.monthly_card_limit > a.monthly_card_limit ? b : a
    );
    return {
      tier_key: best.tier_key,
      monthly_card_limit: best.monthly_card_limit,
      requests_per_minute: best.requests_per_minute,
    };
  }
}

export default ResolveDeveloperTierUseCase;
