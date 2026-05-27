import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';

const mockStripeInstance = {
  subscriptions: {
    list: jest.fn(),
  },
  customers: {
    retrieve: jest.fn(),
  },
};

const mockDbInstance = {
  table: jest.fn(),
};

jest.mock('../../../integrations/stripe', () => ({
  getStripe: () => mockStripeInstance,
  extractProductId: jest.requireActual('../../../integrations/stripe').extractProductId,
}));

jest.mock('../../../../data_layer', () => ({
  getDatabase: () => mockDbInstance,
}));

jest.mock('./reconcileActiveSubscriptions', () => ({
  reconcileActiveSubscriptions: jest.fn().mockResolvedValue(undefined),
}));

import { updateStripeSubscriptions } from './updateStripeSubscriptions';

function buildSubscription(
  productId: string | null | undefined = 'prod_autoSync789',
  overrides: Partial<StripeTypes.Subscription> = {}
): StripeTypes.Subscription {
  return {
    id: 'sub_test123',
    status: 'active',
    cancel_at_period_end: false,
    cancel_at: null,
    customer: 'cus_test456',
    items: {
      data: [
        {
          price: { product: productId } as StripeTypes.Price,
        } as StripeTypes.SubscriptionItem,
      ],
      object: 'list',
      has_more: false,
      url: '',
    },
    ...overrides,
  } as unknown as StripeTypes.Subscription;
}

type Spies = {
  insertSpy: jest.Mock;
  updateSubscriptionSpy: jest.Mock;
  updateUsersSpy: jest.Mock;
};

function setupDbMock(existingRow: Record<string, unknown> | null): Spies {
  const insertSpy = jest.fn().mockResolvedValue([1]);
  const updateSubscriptionSpy = jest.fn().mockResolvedValue(1);
  const updateUsersSpy = jest.fn().mockResolvedValue(1);

  mockDbInstance.table.mockImplementation((tableName: string) => {
    if (tableName === 'subscriptions') {
      return {
        where: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(existingRow),
          update: updateSubscriptionSpy,
        }),
        insert: insertSpy,
      };
    }
    if (tableName === 'users') {
      return {
        where: jest.fn().mockReturnValue({
          update: updateUsersSpy,
        }),
      };
    }
    return { where: jest.fn().mockReturnThis(), update: jest.fn(), insert: jest.fn() };
  });

  return { insertSpy, updateSubscriptionSpy, updateUsersSpy };
}

function setupStripeMock(subscriptions: StripeTypes.Subscription[]) {
  mockStripeInstance.subscriptions.list.mockResolvedValue({
    data: subscriptions,
    has_more: false,
  });
  mockStripeInstance.customers.retrieve.mockResolvedValue({
    id: 'cus_test456',
    email: 'user@example.com',
    object: 'customer',
  });
}

describe('updateStripeSubscriptions — batch provisioning fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts stripe_product_id when creating a new subscription row', async () => {
    const { insertSpy } = setupDbMock(null);
    setupStripeMock([buildSubscription('prod_autoSync789')]);
    await updateStripeSubscriptions();
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_product_id: 'prod_autoSync789' })
    );
  });

  it('updates stripe_product_id when updating an existing subscription row', async () => {
    const { updateSubscriptionSpy } = setupDbMock({
      email: 'user@example.com',
      active: true,
      payload: '{}',
    });
    setupStripeMock([buildSubscription('prod_autoSync789')]);
    await updateStripeSubscriptions();
    expect(updateSubscriptionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_product_id: 'prod_autoSync789' })
    );
  });

  it('backfills users.stripe_customer_id for a new subscription', async () => {
    const { updateUsersSpy } = setupDbMock(null);
    setupStripeMock([buildSubscription()]);
    await updateStripeSubscriptions();
    expect(updateUsersSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_customer_id: 'cus_test456' })
    );
  });

  it('backfills users.stripe_customer_id when updating an existing subscription', async () => {
    const { updateUsersSpy } = setupDbMock({
      email: 'user@example.com',
      active: true,
      payload: '{}',
    });
    setupStripeMock([buildSubscription()]);
    await updateStripeSubscriptions();
    expect(updateUsersSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_customer_id: 'cus_test456' })
    );
  });

  it('inserts stripe_product_id as null when product is absent from subscription', async () => {
    const { insertSpy } = setupDbMock(null);
    setupStripeMock([buildSubscription(null)]);
    await updateStripeSubscriptions();
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_product_id: null })
    );
  });
});
