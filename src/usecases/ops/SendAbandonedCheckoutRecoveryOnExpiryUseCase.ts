import hashToken from '../../lib/misc/hashToken';
import type {
  CheckoutRecoveryDetails,
  IAbandonedCheckoutRecoveryRepository,
} from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import type { EventsSink } from '../../services/events/EventsSink';

export class SendAbandonedCheckoutRecoveryOnExpiryUseCase {
  constructor(
    private readonly repository: IAbandonedCheckoutRecoveryRepository,
    private readonly emailService: IEmailService,
    private readonly eventsSink?: Pick<EventsSink, 'record'>
  ) {}

  async execute(
    sessionId: string,
    email: string | null,
    recovery: CheckoutRecoveryDetails | null = null
  ): Promise<void> {
    if (email == null) {
      console.warn('checkout.session.expired.no_email', {
        session_id_hash: hashToken(sessionId),
      });
      return;
    }

    console.info('checkout.session.expired.recovery_url', {
      present: recovery != null,
      session_id_hash: hashToken(sessionId),
    });

    const optedOut = await this.repository.isMarketingOptedOut(email);
    if (optedOut) {
      console.info('checkout.session.expired.opted_out', {
        session_id_hash: hashToken(sessionId),
      });
      return;
    }

    const token = crypto.randomUUID();
    const claimed = await this.repository.claimSession(
      sessionId,
      email,
      token,
      recovery
    );
    if (claimed) {
      await this.emailService.sendAbandonedCheckoutRecoveryEmail(email, token);
      console.info('checkout.session.expired.recovery_sent', {
        session_id_hash: hashToken(sessionId),
      });
      this.eventsSink?.record({
        name: 'email_batch_sent',
        props: { campaign: 'abandoned_checkout', count: 1 },
      });
    }
  }
}
