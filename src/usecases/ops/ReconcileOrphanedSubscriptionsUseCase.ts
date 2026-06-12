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

export class ReconcileOrphanedSubscriptionsUseCase {
  constructor(
    private readonly orphansRepo: IOrphanedSubscriptionsRepository,
    private readonly notificationsRepo: ISubscriptionRecoveryNotificationsRepository,
    private readonly emailService: IEmailService
  ) {}

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
      const email = orphan.email?.trim();
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
