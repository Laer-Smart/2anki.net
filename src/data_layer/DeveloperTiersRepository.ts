import type { Knex } from 'knex';

export interface DeveloperTierRow {
  tier_key: string;
  stripe_product_id: string;
  stripe_price_id: string;
  monthly_card_limit: number;
  requests_per_minute: number;
  active: boolean;
}

export interface DeveloperTierUpsert {
  tier_key: string;
  stripe_product_id: string;
  stripe_price_id: string;
  monthly_card_limit: number;
  requests_per_minute: number;
}

export interface IDeveloperTiersRepository {
  listActive(): Promise<DeveloperTierRow[]>;
  upsert(tier: DeveloperTierUpsert): Promise<void>;
}

export class DeveloperTiersRepository implements IDeveloperTiersRepository {
  private readonly table = 'developer_tiers';

  constructor(private readonly database: Knex) {}

  async listActive(): Promise<DeveloperTierRow[]> {
    return this.database<DeveloperTierRow>(this.table)
      .where('active', true)
      .select(
        'tier_key',
        'stripe_product_id',
        'stripe_price_id',
        'monthly_card_limit',
        'requests_per_minute',
        'active'
      );
  }

  async upsert(tier: DeveloperTierUpsert): Promise<void> {
    await this.database(this.table)
      .insert({ ...tier, active: true, updated_at: this.database.fn.now() })
      .onConflict('tier_key')
      .merge({
        stripe_product_id: tier.stripe_product_id,
        stripe_price_id: tier.stripe_price_id,
        monthly_card_limit: tier.monthly_card_limit,
        requests_per_minute: tier.requests_per_minute,
        active: true,
        updated_at: this.database.fn.now(),
      });
  }
}

export default DeveloperTiersRepository;
