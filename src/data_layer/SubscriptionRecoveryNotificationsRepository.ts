import type { Knex } from 'knex';

export interface ISubscriptionRecoveryNotificationsRepository {
  wasNotifiedSince(emailHash: string, since: Date): Promise<boolean>;
  recordNotified(emailHash: string): Promise<void>;
}

export class SubscriptionRecoveryNotificationsRepository implements ISubscriptionRecoveryNotificationsRepository {
  constructor(private readonly database: Knex) {}

  async wasNotifiedSince(emailHash: string, since: Date): Promise<boolean> {
    const row = await this.database('subscription_recovery_notifications')
      .where({ email_hash: emailHash })
      .where('notified_at', '>=', since)
      .first();
    return row != null;
  }

  async recordNotified(emailHash: string): Promise<void> {
    await this.database('subscription_recovery_notifications').insert({
      email_hash: emailHash,
    });
  }
}

export class InMemorySubscriptionRecoveryNotificationsRepository implements ISubscriptionRecoveryNotificationsRepository {
  private readonly rows: Array<{ emailHash: string; notifiedAt: Date }> = [];

  async wasNotifiedSince(emailHash: string, since: Date): Promise<boolean> {
    return this.rows.some(
      (row) => row.emailHash === emailHash && row.notifiedAt >= since
    );
  }

  async recordNotified(emailHash: string): Promise<void> {
    this.rows.push({ emailHash, notifiedAt: new Date() });
  }
}

export default SubscriptionRecoveryNotificationsRepository;
