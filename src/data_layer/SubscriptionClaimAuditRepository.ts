import type { Knex } from 'knex';
import type { SubscriptionClaimAuditInitializer } from './public/SubscriptionClaimAudit';
import type SubscriptionClaimAudit from './public/SubscriptionClaimAudit';

export type ClaimOutcome =
  | 'initiate'
  | 'confirm_success'
  | 'confirm_invalid_token'
  | 'confirm_already_consumed'
  | 'confirm_user_has_active_sub'
  | 'replay';

export interface ISubscriptionClaimAuditRepository {
  insert(initializer: SubscriptionClaimAuditInitializer): Promise<SubscriptionClaimAudit>;
  countRecentByIp(ipHash: string, since: Date): Promise<number>;
}

class SubscriptionClaimAuditRepository implements ISubscriptionClaimAuditRepository {
  constructor(private readonly database: Knex) {}

  async insert(initializer: SubscriptionClaimAuditInitializer): Promise<SubscriptionClaimAudit> {
    const rows = await this.database('subscription_claim_audit').insert(initializer).returning('*');
    return rows[0];
  }

  async countRecentByIp(ipHash: string, since: Date): Promise<number> {
    const result = await this.database('subscription_claim_audit')
      .where({ ip_hash: ipHash })
      .where('created_at', '>=', since)
      .count<{ count: string }>('* as count')
      .first();
    return Number(result?.count ?? 0);
  }
}

export default SubscriptionClaimAuditRepository;
