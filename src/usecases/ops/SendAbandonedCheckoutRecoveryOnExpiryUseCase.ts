import hashToken from '../../lib/misc/hashToken';
import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

export class SendAbandonedCheckoutRecoveryOnExpiryUseCase {
  constructor(
    private readonly repository: IAbandonedCheckoutRecoveryRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(sessionId: string, email: string | null): Promise<void> {
    if (email == null) {
      console.warn('checkout.session.expired.no_email', {
        session_id_hash: hashToken(sessionId),
      });
      return;
    }

    const optedOut = await this.repository.isMarketingOptedOut(email);
    if (optedOut) {
      console.info('checkout.session.expired.opted_out', {
        session_id_hash: hashToken(sessionId),
      });
      return;
    }

    const claimed = await this.repository.claimSession(sessionId, email);
    if (claimed) {
      const token = crypto.randomUUID();
      await this.emailService.sendAbandonedCheckoutRecoveryEmail(email, token);
      console.info('checkout.session.expired.recovery_sent', {
        session_id_hash: hashToken(sessionId),
      });
    }
  }
}
