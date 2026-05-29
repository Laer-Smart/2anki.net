import type { Knex } from 'knex';
import type SubscriptionClaimTokens from './public/SubscriptionClaimTokens';
import type { SubscriptionClaimTokensInitializer } from './public/SubscriptionClaimTokens';

export interface ISubscriptionClaimTokensRepository {
  insert(initializer: SubscriptionClaimTokensInitializer): Promise<SubscriptionClaimTokens>;
  findByTokenHash(tokenHash: string): Promise<SubscriptionClaimTokens | null>;
  markConsumed(id: number, trx: Knex.Transaction): Promise<void>;
  countRecentByUser(userId: number, since: Date): Promise<number>;
}

class SubscriptionClaimTokensRepository implements ISubscriptionClaimTokensRepository {
  constructor(private readonly database: Knex) {}

  async insert(initializer: SubscriptionClaimTokensInitializer): Promise<SubscriptionClaimTokens> {
    const rows = await this.database('subscription_claim_tokens').insert(initializer).returning('*');
    return rows[0];
  }

  async findByTokenHash(tokenHash: string): Promise<SubscriptionClaimTokens | null> {
    const row = await this.database('subscription_claim_tokens').where({ token_hash: tokenHash }).first();
    return row ?? null;
  }

  async markConsumed(id: number, trx: Knex.Transaction): Promise<void> {
    await trx('subscription_claim_tokens').where({ id }).update({ consumed_at: trx.fn.now() });
  }

  async countRecentByUser(userId: number, since: Date): Promise<number> {
    const result = await this.database('subscription_claim_tokens')
      .where({ user_id: userId })
      .where('created_at', '>=', since)
      .count<{ count: string }>('* as count')
      .first();
    return Number(result?.count ?? 0);
  }
}

export default SubscriptionClaimTokensRepository;
