import type {
  IOrphanedSubscriptionsRepository,
  OrphanedSubscriptionRow,
} from '../../data_layer/OrphanedSubscriptionsRepository';

export interface OrphanedSubscriptionSummary {
  id: number;
  email: string;
  stripeProductId: string | null;
  createdAt: Date | null;
  customerId: string | null;
}

export class GetOrphanedSubscriptionsUseCase {
  constructor(private readonly repo: IOrphanedSubscriptionsRepository) {}

  async execute(): Promise<OrphanedSubscriptionSummary[]> {
    const rows = await this.repo.findOrphanedActiveSubscriptions();
    return rows.map(toSummary);
  }
}

function toSummary(row: OrphanedSubscriptionRow): OrphanedSubscriptionSummary {
  return {
    id: row.id,
    email: row.email,
    stripeProductId: row.stripe_product_id,
    createdAt: row.created_at,
    customerId: row.customer_id,
  };
}
