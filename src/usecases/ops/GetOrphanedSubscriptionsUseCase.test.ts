import { GetOrphanedSubscriptionsUseCase } from './GetOrphanedSubscriptionsUseCase';
import type {
  IOrphanedSubscriptionsRepository,
  OrphanedSubscriptionRow,
} from '../../data_layer/OrphanedSubscriptionsRepository';

class FakeOrphanedSubscriptionsRepository implements IOrphanedSubscriptionsRepository {
  constructor(private readonly rows: OrphanedSubscriptionRow[]) {}
  async findOrphanedActiveSubscriptions(): Promise<OrphanedSubscriptionRow[]> {
    return this.rows;
  }
}

describe('GetOrphanedSubscriptionsUseCase', () => {
  it('maps repository rows to a typed summary shape', async () => {
    const createdAt = new Date('2026-05-01T00:00:00.000Z');
    const repo = new FakeOrphanedSubscriptionsRepository([
      {
        id: 7,
        email: 'payer@example.com',
        stripe_product_id: 'prod_unlimited',
        created_at: createdAt,
        customer_id: 'cus_123',
      },
    ]);
    const useCase = new GetOrphanedSubscriptionsUseCase(repo);

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        id: 7,
        email: 'payer@example.com',
        stripeProductId: 'prod_unlimited',
        createdAt,
        customerId: 'cus_123',
      },
    ]);
  });

  it('returns an empty list when there are no orphans', async () => {
    const repo = new FakeOrphanedSubscriptionsRepository([]);
    const useCase = new GetOrphanedSubscriptionsUseCase(repo);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});
