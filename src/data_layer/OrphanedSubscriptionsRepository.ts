import type { Knex } from 'knex';

export interface OrphanedSubscriptionRow {
  id: number;
  email: string;
  stripe_product_id: string | null;
  created_at: Date | null;
  customer_id: string | null;
}

export interface IOrphanedSubscriptionsRepository {
  findOrphanedActiveSubscriptions(): Promise<OrphanedSubscriptionRow[]>;
}

export function buildOrphanedSubscriptionsQuery(
  database: Knex
): Knex.QueryBuilder {
  return database('subscriptions')
    .select(
      'subscriptions.id',
      'subscriptions.email',
      'subscriptions.stripe_product_id',
      'subscriptions.created_at'
    )
    .select(database.raw(`subscriptions.payload->>'customer' as customer_id`))
    .where('subscriptions.active', true)
    .whereNotExists((qb) =>
      qb
        .select(database.raw('1'))
        .from('users')
        .whereRaw('lower(trim(users.email)) = lower(trim(subscriptions.email))')
    )
    .whereNotExists((qb) =>
      qb
        .select(database.raw('1'))
        .from('users')
        .whereRaw('lower(trim(users.email)) = subscriptions.linked_email')
    )
    .whereNotExists((qb) =>
      qb
        .select(database.raw('1'))
        .from('users')
        .whereRaw(
          `users.stripe_customer_id = subscriptions.payload->>'customer'`
        )
    );
}

export class OrphanedSubscriptionsRepository implements IOrphanedSubscriptionsRepository {
  constructor(private readonly database: Knex) {}

  findOrphanedActiveSubscriptions(): Promise<OrphanedSubscriptionRow[]> {
    return buildOrphanedSubscriptionsQuery(this.database);
  }
}

export default OrphanedSubscriptionsRepository;
