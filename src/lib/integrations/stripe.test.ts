process.env.STRIPE_KEY = 'sk_test_fake_key_for_unit_tests';

import knexLib, { Knex } from 'knex';
import { updateStoreSubscription } from './stripe';
import type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';

const makeCustomer = (
  email: string | null,
  id = 'cus_test123'
): StripeTypes.Customer =>
  ({ email, id, object: 'customer' }) as unknown as StripeTypes.Customer;

const makeSubscription = (
  status: StripeTypes.Subscription['status'],
  productId: string,
  options: {
    customer?: string;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: number | null;
    userId?: string;
    pauseCollection?: { behavior: string; resumes_at: number } | null;
  } = {}
): StripeTypes.Subscription =>
  ({
    status,
    cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
    cancel_at: options.cancelAt ?? null,
    customer: options.customer ?? 'cus_test123',
    metadata: options.userId != null ? { user_id: options.userId } : {},
    pause_collection: options.pauseCollection ?? null,
    items: { data: [{ price: { product: productId } }] },
  }) as unknown as StripeTypes.Subscription;

describe('updateStoreSubscription', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knexLib({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('users', (t) => {
      t.increments('id');
      t.string('email');
      t.string('stripe_customer_id');
    });
    await db.schema.createTable('subscriptions', (t) => {
      t.increments('id');
      t.string('email').unique();
      t.boolean('active');
      t.json('payload');
      t.string('stripe_product_id');
      t.string('linked_email');
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('inserts the subscription row with the extracted product id and active flag', async () => {
    await db('users').insert({
      email: 'user@example.com',
      stripe_customer_id: null,
    });

    const result = await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    const row = await db('subscriptions')
      .where({ email: 'user@example.com' })
      .first();
    expect(row.stripe_product_id).toBe('prod_auto_sync');
    expect(Boolean(row.active)).toBe(true);
    expect(result).toEqual({ status: 'linked', resolvedUserId: 1 });
  });

  test('marks active=false when subscription status is canceled', async () => {
    await db('users').insert({ email: 'user@example.com' });

    await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('canceled', 'prod_auto_sync')
    );

    const row = await db('subscriptions')
      .where({ email: 'user@example.com' })
      .first();
    expect(Boolean(row.active)).toBe(false);
  });

  test('marks active=false when the subscription is paused despite active status', async () => {
    await db('users').insert({ email: 'user@example.com' });

    await updateStoreSubscription(
      db,
      makeCustomer('user@example.com'),
      makeSubscription('active', 'prod_auto_sync', {
        pauseCollection: { behavior: 'void', resumes_at: 1893456000 },
      })
    );

    const row = await db('subscriptions')
      .where({ email: 'user@example.com' })
      .first();
    expect(Boolean(row.active)).toBe(false);
  });

  test('links by metadata.user_id even when the Stripe email differs from the account', async () => {
    await db('users').insert({
      email: 'account@example.com',
      stripe_customer_id: null,
    });

    const result = await updateStoreSubscription(
      db,
      makeCustomer('paid-with@example.com'),
      makeSubscription('active', 'prod_auto_sync', { userId: '1' })
    );

    expect(result).toEqual({ status: 'linked', resolvedUserId: 1 });
    const user = await db('users').where({ id: 1 }).first();
    expect(user.stripe_customer_id).toBe('cus_test123');
    const row = await db('subscriptions')
      .where({ email: 'paid-with@example.com' })
      .first();
    expect(row.linked_email).toBe('account@example.com');
  });

  test('links by stripe_customer_id when no metadata is present', async () => {
    await db('users').insert({
      email: 'account@example.com',
      stripe_customer_id: 'cus_test123',
    });

    const result = await updateStoreSubscription(
      db,
      makeCustomer('different@example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    expect(result.status).toBe('linked');
    const row = await db('subscriptions')
      .where({ email: 'different@example.com' })
      .first();
    expect(row.linked_email).toBe('account@example.com');
  });

  test('links by email and leaves linked_email null when emails match', async () => {
    await db('users').insert({ email: 'user@example.com' });

    const result = await updateStoreSubscription(
      db,
      makeCustomer('User@Example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    expect(result).toEqual({ status: 'linked', resolvedUserId: 1 });
    const row = await db('subscriptions')
      .where({ email: 'user@example.com' })
      .first();
    expect(row.linked_email).toBeNull();
  });

  test('returns unlinked and fires no users update when no account matches', async () => {
    const result = await updateStoreSubscription(
      db,
      makeCustomer('nobody@example.com'),
      makeSubscription('active', 'prod_auto_sync')
    );

    expect(result).toEqual({ status: 'unlinked', resolvedUserId: null });
    const row = await db('subscriptions')
      .where({ email: 'nobody@example.com' })
      .first();
    expect(row.linked_email).toBeNull();
  });

  test('preserves an existing linked_email when a later update has matching emails', async () => {
    await db('users').insert({
      email: 'account@example.com',
      stripe_customer_id: 'cus_test123',
    });
    await db('subscriptions').insert({
      email: 'paid-with@example.com',
      active: true,
      payload: '{}',
      stripe_product_id: 'prod_auto_sync',
      linked_email: 'account@example.com',
    });

    await updateStoreSubscription(
      db,
      makeCustomer('paid-with@example.com'),
      makeSubscription('active', 'prod_auto_sync', { customer: 'cus_test123' })
    );

    const row = await db('subscriptions')
      .where({ email: 'paid-with@example.com' })
      .first();
    expect(row.linked_email).toBe('account@example.com');
  });
});
