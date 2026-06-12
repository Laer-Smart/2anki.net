import type { IOrphanedSubscriptionsRepository } from '../../data_layer/OrphanedSubscriptionsRepository';
import type { ISubscriptionRecoveryNotificationsRepository } from '../../data_layer/SubscriptionRecoveryNotificationsRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import { emailHash } from '../../lib/emailHash';

export const RECOVERY_NOTIFY_COOLDOWN_DAYS = 14;

export interface ReconcileOrphanedSubscriptionsResult {
  found: number;
  emailed: number;
  skippedRecentlyNotified: number;
  skippedNoEmail: number;
}

export type LiveCustomerEmailFetcher = (
  customerId: string
) => Promise<string | null>;

export class ReconcileOrphanedSubscriptionsUseCase {
  constructor(
    private readonly orphansRepo: IOrphanedSubscriptionsRepository,
    private readonly notificationsRepo: ISubscriptionRecoveryNotificationsRepository,
    private readonly emailService: IEmailService,
    private readonly fetchLiveCustomerEmail?: LiveCustomerEmailFetcher
  ) {}

  private async resolveRecipientEmail(
    storedEmail: string | null,
    customerId: string | null
  ): Promise<string | null> {
    const stored = storedEmail?.trim() ?? null;
    const storedOrNull = stored != null && stored.length > 0 ? stored : null;
    if (this.fetchLiveCustomerEmail == null || customerId == null) {
      return storedOrNull;
    }
    try {
      const live = (await this.fetchLiveCustomerEmail(customerId))?.trim();
      if (live != null && live.length > 0) {
        return live;
      }
    } catch (error) {
      console.error('[ops] live customer email lookup failed', {
        reason: (error as Error).message,
      });
    }
    return storedOrNull;
  }

  async execute(): Promise<ReconcileOrphanedSubscriptionsResult> {
    const orphans = await this.orphansRepo.findOrphanedActiveSubscriptions();
    const cooldownStart = new Date(
      Date.now() - RECOVERY_NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    );

    const result: ReconcileOrphanedSubscriptionsResult = {
      found: orphans.length,
      emailed: 0,
      skippedRecentlyNotified: 0,
      skippedNoEmail: 0,
    };

    for (const orphan of orphans) {
      const email = await this.resolveRecipientEmail(
        orphan.email,
        orphan.customer_id
      );
      if (email == null || email.length === 0) {
        result.skippedNoEmail++;
        continue;
      }

      const hash = emailHash(email);
      const alreadyNotified = await this.notificationsRepo.wasNotifiedSince(
        hash,
        cooldownStart
      );
      if (alreadyNotified) {
        result.skippedRecentlyNotified++;
        continue;
      }

      await this.emailService.sendSubscriptionRecoveryEmail(email, email);
      await this.notificationsRepo.recordNotified(hash);
      result.emailed++;
      console.info('[ops] subscription recovery email sent', {
        recipient_hash: hash,
      });
    }

    return result;
  }
}
