import { InMemoryUserPassRepository } from '../../data_layer/UserPassRepository';
import { InMemoryAppleTransactionsRepository } from '../../data_layer/AppleTransactionsRepository';
import {
  AppleUnavailableError,
  AppleVerificationError,
  type DecodedAppleTransaction,
  type IAppleStoreKitService,
} from '../../services/AppleStoreKitService';
import { RedeemAppleTransactionUseCase } from './RedeemAppleTransactionUseCase';
import { IapRedeemError } from './IapRedeemError';

const NOW = new Date('2026-06-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const USER_ID = 42;

function decoded(
  overrides: Partial<DecodedAppleTransaction> = {}
): DecodedAppleTransaction {
  return {
    transactionId: 'txn-1',
    productId: 'daypass.24h',
    bundleId: 'net.2anki.app',
    environment: 'Sandbox',
    ...overrides,
  };
}

function serviceReturning(value: DecodedAppleTransaction): IAppleStoreKitService {
  return { verifyTransaction: jest.fn().mockResolvedValue(value) };
}

function serviceThrowing(error: Error): IAppleStoreKitService {
  return { verifyTransaction: jest.fn().mockRejectedValue(error) };
}

function build(service: IAppleStoreKitService) {
  const passes = new InMemoryUserPassRepository();
  const ledger = new InMemoryAppleTransactionsRepository();
  const useCase = new RedeemAppleTransactionUseCase(
    service,
    passes,
    ledger,
    () => NOW
  );
  return { useCase, passes, ledger };
}

describe('RedeemAppleTransactionUseCase', () => {
  beforeAll(() => {
    process.env.THE_HASHING_SECRET = 'test-hashing-secret';
  });

  it.each([
    {
      productId: 'daypass.24h',
      kind: '24h',
      message: 'Day Pass active — unlimited cards for the next 24 hours',
      durationMs: DAY_MS,
    },
    {
      productId: 'weekpass.7d',
      kind: '7d',
      message: 'Week Pass active — unlimited cards for the next 7 days',
      durationMs: 7 * DAY_MS,
    },
  ])(
    'grants $kind for a valid $productId transaction',
    async ({ productId, kind, message, durationMs }) => {
      const { useCase, passes } = build(
        serviceReturning(decoded({ productId, transactionId: 't' }))
      );

      const result = await useCase.execute({
        userId: USER_ID,
        jws: 'signed',
        productId,
      });

      expect(result.message).toBe(message);
      expect(result.pass.kind).toBe(kind);
      const active = await passes.findActive(USER_ID, NOW);
      expect(active?.expires_at).toEqual(new Date(NOW.getTime() + durationMs));
    }
  );

  it('accumulates onto an existing active pass window', async () => {
    const { useCase, passes } = build(
      serviceReturning(decoded({ productId: 'daypass.24h', transactionId: 't2' }))
    );
    passes.seed({
      user_id: USER_ID,
      kind: '24h',
      expires_at: new Date(NOW.getTime() + DAY_MS),
      stripe_payment_intent_id: 'apple:earlier',
    });

    const result = await useCase.execute({
      userId: USER_ID,
      jws: 'signed',
      productId: 'daypass.24h',
    });

    expect(result.pass.expiresAt).toEqual(new Date(NOW.getTime() + 2 * DAY_MS));
  });

  it('returns 409 for an already-credited transaction and grants nothing new', async () => {
    const { useCase, ledger } = build(
      serviceReturning(decoded({ transactionId: 'dupe' }))
    );
    await ledger.record(
      {
        userId: USER_ID,
        transactionId: 'dupe',
        productId: 'daypass.24h',
        environment: 'Sandbox',
      },
      NOW
    );

    await expect(
      useCase.execute({ userId: USER_ID, jws: 'signed', productId: 'daypass.24h' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('returns 400 and credits nothing when verification fails', async () => {
    const { useCase, passes, ledger } = build(
      serviceThrowing(new AppleVerificationError())
    );

    await expect(
      useCase.execute({ userId: USER_ID, jws: 'bad', productId: 'daypass.24h' })
    ).rejects.toMatchObject({ status: 400 });

    expect(await passes.findActive(USER_ID, NOW)).toBeNull();
    await expect(
      ledger.record(
        {
          userId: USER_ID,
          transactionId: 'txn-1',
          productId: 'daypass.24h',
          environment: 'Sandbox',
        },
        NOW
      )
    ).resolves.toBeDefined();
  });

  it('returns 502 when Apple is unavailable', async () => {
    const { useCase } = build(serviceThrowing(new AppleUnavailableError()));

    await expect(
      useCase.execute({ userId: USER_ID, jws: 'signed', productId: 'daypass.24h' })
    ).rejects.toMatchObject({ status: 502 });
  });

  it('returns 400 when the decoded product id does not match the body', async () => {
    const { useCase } = build(
      serviceReturning(decoded({ productId: 'weekpass.7d' }))
    );

    await expect(
      useCase.execute({ userId: USER_ID, jws: 'signed', productId: 'daypass.24h' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('returns 400 for an unmapped product', async () => {
    const { useCase } = build(
      serviceReturning(decoded({ productId: 'unlimited.monthly' }))
    );

    await expect(
      useCase.execute({
        userId: USER_ID,
        jws: 'signed',
        productId: 'unlimited.monthly',
      })
    ).rejects.toBeInstanceOf(IapRedeemError);
  });
});
