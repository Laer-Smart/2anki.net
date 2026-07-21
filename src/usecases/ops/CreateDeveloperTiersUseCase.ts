import type Stripe from 'stripe';
import type { IDeveloperTiersRepository } from '../../data_layer/DeveloperTiersRepository';

export const DEV_TIER_METADATA_KEY = '2anki_dev_tier';

export interface DeveloperTierDefinition {
  key: string;
  name: string;
  amount_cents: number;
  monthly_card_limit: number;
  requests_per_minute: number;
}

export const DEVELOPER_TIER_DEFINITIONS: DeveloperTierDefinition[] = [
  {
    key: 'starter',
    name: '2anki API Starter',
    amount_cents: 2900,
    monthly_card_limit: 5000,
    requests_per_minute: 30,
  },
  {
    key: 'growth',
    name: '2anki API Growth',
    amount_cents: 9900,
    monthly_card_limit: 30000,
    requests_per_minute: 60,
  },
];

export interface ProvisionedTier {
  tier_key: string;
  stripe_product_id: string;
  stripe_price_id: string;
  created_product: boolean;
  created_price: boolean;
}

export class CreateDeveloperTiersUseCase {
  constructor(
    private readonly stripe: Stripe,
    private readonly tiers: IDeveloperTiersRepository
  ) {}

  async execute(): Promise<ProvisionedTier[]> {
    const existingProducts = await this.stripe.products.list({
      active: true,
      limit: 100,
    });

    const results: ProvisionedTier[] = [];
    for (const definition of DEVELOPER_TIER_DEFINITIONS) {
      const provisioned = await this.provisionTier(
        definition,
        existingProducts.data
      );
      await this.tiers.upsert({
        tier_key: definition.key,
        stripe_product_id: provisioned.stripe_product_id,
        stripe_price_id: provisioned.stripe_price_id,
        monthly_card_limit: definition.monthly_card_limit,
        requests_per_minute: definition.requests_per_minute,
      });
      results.push(provisioned);
    }
    return results;
  }

  private async provisionTier(
    definition: DeveloperTierDefinition,
    existingProducts: Stripe.Product[]
  ): Promise<ProvisionedTier> {
    let createdProduct = false;
    let product = existingProducts.find(
      (candidate) =>
        candidate.metadata?.[DEV_TIER_METADATA_KEY] === definition.key
    );
    if (product == null) {
      product = await this.stripe.products.create({
        name: definition.name,
        metadata: { [DEV_TIER_METADATA_KEY]: definition.key },
      });
      createdProduct = true;
    }

    const prices = await this.stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let createdPrice = false;
    let price = prices.data.find(
      (candidate) =>
        candidate.unit_amount === definition.amount_cents &&
        candidate.currency === 'usd' &&
        candidate.recurring?.interval === 'month'
    );
    if (price == null) {
      price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: definition.amount_cents,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { [DEV_TIER_METADATA_KEY]: definition.key },
      });
      createdPrice = true;
    }

    return {
      tier_key: definition.key,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      created_product: createdProduct,
      created_price: createdPrice,
    };
  }
}

export default CreateDeveloperTiersUseCase;
