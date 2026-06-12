import { ReconcileOrphanedSubscriptionsUseCase } from './ReconcileOrphanedSubscriptionsUseCase';
import type {
  IOrphanedSubscriptionsRepository,
  OrphanedSubscriptionRow,
} from '../../data_layer/OrphanedSubscriptionsRepository';
import { InMemorySubscriptionRecoveryNotificationsRepository } from '../../data_layer/SubscriptionRecoveryNotificationsRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import { emailHash } from '../../lib/emailHash';

class FakeOrphansRepo implements IOrphanedSubscriptionsRepository {
  constructor(private readonly rows: OrphanedSubscriptionRow[]) {}
  async findOrphanedActiveSubscriptions(): Promise<OrphanedSubscriptionRow[]> {
    return this.rows;
  }
}

function orphan(
  overrides: Partial<OrphanedSubscriptionRow> = {}
): OrphanedSubscriptionRow {
  return {
    id: 1,
    email: 'payer@example.com',
    stripe_product_id: 'prod_unlimited',
    created_at: new Date('2026-05-01T00:00:00.000Z'),
    customer_id: 'cus_123',
    ...overrides,
  };
}

function makeEmailSpy(): IEmailService & {
  recoveryCalls: Array<[string, string]>;
} {
  const recoveryCalls: Array<[string, string]> = [];
  const service = {
    recoveryCalls,
    async sendSubscriptionRecoveryEmail(to: string, paidEmail: string) {
      recoveryCalls.push([to, paidEmail]);
    },
  } as unknown as IEmailService & { recoveryCalls: Array<[string, string]> };
  return service;
}

describe('ReconcileOrphanedSubscriptionsUseCase', () => {
  it('emails each orphan at its paid email and records the notification', async () => {
    const orphansRepo = new FakeOrphansRepo([
      orphan({ id: 1, email: 'a@example.com' }),
      orphan({ id: 2, email: 'b@example.com' }),
    ]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    const email = makeEmailSpy();
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      found: 2,
      emailed: 2,
      skippedRecentlyNotified: 0,
      skippedNoEmail: 0,
    });
    expect(email.recoveryCalls).toEqual([
      ['a@example.com', 'a@example.com'],
      ['b@example.com', 'b@example.com'],
    ]);
  });

  it('skips an orphan already notified within the cooldown window', async () => {
    const orphansRepo = new FakeOrphansRepo([
      orphan({ id: 1, email: 'a@example.com' }),
    ]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    await notificationsRepo.recordNotified(emailHash('a@example.com'));
    const email = makeEmailSpy();
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      found: 1,
      emailed: 0,
      skippedRecentlyNotified: 1,
      skippedNoEmail: 0,
    });
    expect(email.recoveryCalls).toEqual([]);
  });

  it('counts an orphan with a blank email as skippedNoEmail', async () => {
    const orphansRepo = new FakeOrphansRepo([orphan({ id: 1, email: '   ' })]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    const email = makeEmailSpy();
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      found: 1,
      emailed: 0,
      skippedRecentlyNotified: 0,
      skippedNoEmail: 1,
    });
    expect(email.recoveryCalls).toEqual([]);
  });

  it('is idempotent on a second run — the recorded notification suppresses a re-send', async () => {
    const orphansRepo = new FakeOrphansRepo([
      orphan({ id: 1, email: 'a@example.com' }),
    ]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    const email = makeEmailSpy();
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email
    );

    await useCase.execute();
    const second = await useCase.execute();

    expect(second).toEqual({
      found: 1,
      emailed: 0,
      skippedRecentlyNotified: 1,
      skippedNoEmail: 0,
    });
    expect(email.recoveryCalls).toEqual([['a@example.com', 'a@example.com']]);
  });

  it('prefers the live Stripe customer email over the stale stored email', async () => {
    const orphansRepo = new FakeOrphansRepo([
      orphan({ id: 1, email: 'stale@example.com', customer_id: 'cus_live' }),
    ]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    const email = makeEmailSpy();
    const fetchLive = async (customerId: string) =>
      customerId === 'cus_live' ? 'fresh@example.com' : null;
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email,
      fetchLive
    );

    const result = await useCase.execute();

    expect(result.emailed).toBe(1);
    expect(email.recoveryCalls).toEqual([
      ['fresh@example.com', 'fresh@example.com'],
    ]);
    expect(
      await notificationsRepo.wasNotifiedSince(
        emailHash('fresh@example.com'),
        new Date(0)
      )
    ).toBe(true);
  });

  it('falls back to the stored email when the live lookup throws', async () => {
    const orphansRepo = new FakeOrphansRepo([
      orphan({ id: 1, email: 'stored@example.com', customer_id: 'cus_x' }),
    ]);
    const notificationsRepo =
      new InMemorySubscriptionRecoveryNotificationsRepository();
    const email = makeEmailSpy();
    const fetchLive = async () => {
      throw new Error('stripe down');
    };
    const useCase = new ReconcileOrphanedSubscriptionsUseCase(
      orphansRepo,
      notificationsRepo,
      email,
      fetchLive
    );

    const result = await useCase.execute();

    expect(result.emailed).toBe(1);
    expect(email.recoveryCalls).toEqual([
      ['stored@example.com', 'stored@example.com'],
    ]);
  });
});
