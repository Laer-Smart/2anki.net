process.env.STRIPE_KEY = 'sk_test_fake_key_for_unit_tests';

import { updateStoreSubscription } from './stripe';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
import { Knex } from 'knex';

const makeInsertChain = () => {
  const mergeChain = { merge: jest.fn().mockResolvedValue(1) };
  const onConflictChain = { merge: jest.fn().mockReturnValue(mergeChain) };
  const insertChain = {
    onConflict: jest.fn().mockReturnValue(onConflictChain),
  };
  return { insertChain, onConflictChain, mergeChain };
};

const makeKnex = () => {
  const { insertChain, onConflictChain } = makeInsertChain();
  const whereChain = { update: jest.fn().mockResolvedValue(1) };
  const usersChain = { where: jest.fn().mockReturnValue(whereChain) };

  const db = jest.fn((table: string) => {
    if (table === 'subscriptions') {
      return { insert: jest.fn().mockReturnValue(insertChain) };
    }
    return usersChain;
  }) as unknown as Knex;

  return { db, insertChain, onConflictChain, whereChain };
};

const makeCustomer = (
  email: string | null,
  id = 'cus_test123'
): StripeTypes.Customer =>
  ({ email, id, object: 'customer' }) as unknown as StripeTypes.Customer;

const makeSubscription = (
  status: StripeTypes.Subscription['status'],
  productId: string,
  cancel_at_period_end = false,
  cancel_at: number | null = null
): StripeTypes.Subscription =>
  ({
    status,
    cancel_at_period_end,
    cancel_at,
    customer: 'cus_test123',
    items: {
      data: [{ price: { product: productId } }],
    },
  }) as unknown as StripeTypes.Subscription;

describe('updateStoreSubscription', () => {
  test('inserts with stripe_product_id extracted from subscription items', async () => {
    const { db, onConflictChain } = makeKnex();
    await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    const subsResult = (db as unknown as jest.Mock).mock.results[0]?.value;
    expect(subsResult.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_product_id: 'prod_auto_sync',
        active: true,
      })
    );
    expect(onConflictChain.merge).toHaveBeenCalledWith([
      'active',
      'payload',
      'stripe_product_id',
    ]);
  });

  test('marks active=false when subscription status is canceled', async () => {
    const { db } = makeKnex();
    await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('canceled', 'prod_auto_sync')
    );

    const subsResult = (db as unknown as jest.Mock).mock.results[0]?.value;
    expect(subsResult.insert).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  test('stamps stripe_customer_id on users table using subscription.customer', async () => {
    const { db, whereChain } = makeKnex();
    await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    const usersCall = (db as unknown as jest.Mock).mock.calls.find(
      (c) => c[0] === 'users'
    );
    expect(usersCall).toBeDefined();
    expect(whereChain.update).toHaveBeenCalledWith({
      stripe_customer_id: 'cus_test123',
    });
  });

  test('skips users table update when customer email is null', async () => {
    const { db } = makeKnex();
    await updateStoreSubscription(
      db,
      makeCustomer(null),
      makeSubscription('active', 'prod_auto_sync')
    );

    const usersCall = (db as unknown as jest.Mock).mock.calls.find(
      (c) => c[0] === 'users'
    );
    expect(usersCall).toBeUndefined();
  });
});
