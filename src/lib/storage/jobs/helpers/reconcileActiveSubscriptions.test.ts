import { reconcileActiveSubscriptions } from './reconcileActiveSubscriptions';

type DbMock = jest.Mock & { updateSpy: jest.Mock };

function buildDbMock(
  activeRows: Array<{ id: number; email: string; payload: unknown }>
): DbMock {
  const updateSpy = jest.fn().mockResolvedValue(1);

  const db = jest.fn().mockImplementation(() => {
    const builder: Record<string, unknown> = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: updateSpy,
      then: (resolve: (value: unknown) => void) => resolve(activeRows),
    };
    return builder;
  }) as DbMock;
  db.updateSpy = updateSpy;
  return db;
}

function buildStripeMock(retrieveImpl: (id: string) => Promise<any>) {
  return {
    subscriptions: {
      retrieve: jest.fn().mockImplementation(retrieveImpl),
    },
  } as any;
}

describe('reconcileActiveSubscriptions', () => {
  it('flips DB row inactive when Stripe no longer reports the sub as active', async () => {
    const db = buildDbMock([
      { id: 1, email: 'user@example.com', payload: { id: 'sub_1' } },
    ]);
    const stripe = buildStripeMock(async () => ({
      id: 'sub_1',
      status: 'canceled',
    }));

    await reconcileActiveSubscriptions(db as any, stripe);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_1');
    expect(db.updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  it('leaves DB row alone when Stripe still reports the sub as active', async () => {
    const db = buildDbMock([
      { id: 1, email: 'user@example.com', payload: { id: 'sub_1' } },
    ]);
    const stripe = buildStripeMock(async () => ({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
    }));

    await reconcileActiveSubscriptions(db as any, stripe);

    expect(db.updateSpy).not.toHaveBeenCalled();
  });

  it('flips DB row inactive for scheduled-cancel subs past their period end', async () => {
    const pastSeconds = Math.floor(Date.now() / 1000) - 60;
    const db = buildDbMock([
      { id: 1, email: 'user@example.com', payload: { id: 'sub_1' } },
    ]);
    const stripe = buildStripeMock(async () => ({
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: true,
      cancel_at: pastSeconds,
    }));

    await reconcileActiveSubscriptions(db as any, stripe);

    expect(db.updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  it('flips DB row inactive when Stripe returns 404 for the sub', async () => {
    const db = buildDbMock([
      { id: 1, email: 'user@example.com', payload: { id: 'sub_missing' } },
    ]);
    const stripe = {
      subscriptions: {
        retrieve: jest.fn().mockRejectedValue({
          statusCode: 404,
          message: 'No such subscription',
        }),
      },
    } as any;

    await reconcileActiveSubscriptions(db as any, stripe);

    expect(db.updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  it('skips rows with missing or malformed payload without throwing', async () => {
    const db = buildDbMock([
      { id: 1, email: 'a@example.com', payload: null },
      { id: 2, email: 'b@example.com', payload: 'not-json' },
    ]);
    const stripe = buildStripeMock(async () => ({ status: 'canceled' }));

    await expect(
      reconcileActiveSubscriptions(db as any, stripe)
    ).resolves.toBeUndefined();

    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(db.updateSpy).not.toHaveBeenCalled();
  });

  it('does not throw when a single Stripe lookup fails; continues to next row', async () => {
    const db = buildDbMock([
      { id: 1, email: 'a@example.com', payload: { id: 'sub_1' } },
      { id: 2, email: 'b@example.com', payload: { id: 'sub_2' } },
    ]);
    const retrieve = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ status: 'canceled' });
    const stripe = { subscriptions: { retrieve } } as any;

    await reconcileActiveSubscriptions(db as any, stripe);

    expect(retrieve).toHaveBeenCalledTimes(2);
    expect(db.updateSpy).toHaveBeenCalledTimes(1);
  });
});
