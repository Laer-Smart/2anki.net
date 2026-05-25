import { reconcilePassGrants, StripeClient } from './reconcilePassGrants';

const makeStripeIntent = (
  overrides: Partial<{
    id: string;
    status: string;
    created: number;
    metadata: Record<string, string>;
  }> = {}
) => ({
  id: 'pi_test_001',
  status: 'succeeded',
  created: Math.floor(Date.now() / 1000) - 60,
  metadata: {
    checkout_session_id: 'cs_test_001',
    pass_kind: '24h',
    user_id: '42',
  } as Record<string, string>,
  ...overrides,
});

const makeStripe = (intents: ReturnType<typeof makeStripeIntent>[] = []): StripeClient => ({
  paymentIntents: {
    list: jest.fn().mockResolvedValue({ data: intents }),
  },
});

const makeDb = (passRow: unknown = null) => {
  const firstFn = jest.fn().mockResolvedValue(passRow);
  const insertFn = jest.fn().mockReturnThis();
  const onConflictFn = jest.fn().mockReturnThis();
  const ignoreFn = jest.fn().mockResolvedValue([]);

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    first: firstFn,
    insert: insertFn,
    onConflict: onConflictFn,
    ignore: ignoreFn,
  };

  const db = jest.fn().mockReturnValue(queryBuilder) as unknown as import('knex').Knex;

  return { db, queryBuilder };
};

describe('reconcilePassGrants', () => {
  it('returns zero checked/healed when no succeeded pass intents exist', async () => {
    const stripe = makeStripe([]);
    const { db } = makeDb();

    const result = await reconcilePassGrants(stripe, db);

    expect(result).toEqual({ checked: 0, healed: 0, alerts: [] });
  });

  it('skips intents without pass_kind metadata', async () => {
    const intent = makeStripeIntent({ metadata: { checkout_session_id: 'cs_1' } });
    const stripe = makeStripe([intent]);
    const { db } = makeDb();

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(0);
  });

  it('skips non-succeeded intents', async () => {
    const intent = makeStripeIntent({ status: 'processing' });
    const stripe = makeStripe([intent]);
    const { db } = makeDb();

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(0);
  });

  it('returns no alerts when user pass already exists in DB', async () => {
    const intent = makeStripeIntent();
    const stripe = makeStripe([intent]);
    const { db } = makeDb({ stripe_payment_intent_id: 'pi_test_001' });

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(1);
    expect(result.alerts).toHaveLength(0);
    expect(result.healed).toBe(0);
  });

  it('alerts and heals when user pass is missing from DB', async () => {
    const intent = makeStripeIntent();
    const stripe = makeStripe([intent]);
    const { db, queryBuilder } = makeDb(null);

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(1);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({
      passKind: '24h',
      userId: 42,
      reason: 'missing_from_user_passes',
    });
    expect(result.healed).toBe(1);
    expect(queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 42,
        kind: '24h',
        stripe_payment_intent_id: 'pi_test_001',
      })
    );
  });

  it('alerts and heals anonymous pass when missing from DB', async () => {
    const intent = makeStripeIntent({
      metadata: {
        checkout_session_id: 'cs_anon_001',
        pass_kind: '7d',
        pass_anonymous: '1',
      },
    });
    const stripe = makeStripe([intent]);
    const { db, queryBuilder } = makeDb(null);

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(1);
    expect(result.alerts[0]).toMatchObject({
      passKind: '7d',
      userId: null,
      reason: 'missing_from_anonymous_passes',
    });
    expect(result.healed).toBe(1);
    expect(queryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: 'cs_anon_001',
        kind: '7d',
        payment_intent_id: 'pi_test_001',
      })
    );
  });

  it('skips intents with no checkout_session_id metadata', async () => {
    const intent = makeStripeIntent({
      metadata: { pass_kind: '24h', user_id: '42' },
    });
    const stripe = makeStripe([intent]);
    const { db } = makeDb();

    const result = await reconcilePassGrants(stripe, db );

    expect(result.checked).toBe(0);
  });
});
