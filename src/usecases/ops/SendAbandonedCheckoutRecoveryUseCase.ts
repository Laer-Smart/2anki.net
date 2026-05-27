import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

export interface SendAbandonedCheckoutRecoveryResult {
  dryRun: boolean;
  candidates: number;
  sent: number;
  failed: number;
  failures: { email: string; error: string }[];
}

const MAX_EMAIL_LEN = 320;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

const isValidEmail = (value: string): boolean =>
  value.length <= MAX_EMAIL_LEN && EMAIL_RE.test(value);

export class SendAbandonedCheckoutRecoveryUseCase {
  constructor(
    private readonly emailService: IEmailService,
    private readonly repository?: IAbandonedCheckoutRecoveryRepository
  ) {}

  async execute(
    emails: string[],
    dryRun = true
  ): Promise<SendAbandonedCheckoutRecoveryResult> {
    const unique = Array.from(
      new Set(
        emails
          .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
          .filter((e) => e.length > 0 && isValidEmail(e))
      )
    );

    if (dryRun) {
      return {
        dryRun: true,
        candidates: unique.length,
        sent: 0,
        failed: 0,
        failures: [],
      };
    }

    const failures: { email: string; error: string }[] = [];
    let sent = 0;
    for (const email of unique) {
      try {
        if (this.repository != null) {
          const optedOut = await this.repository.isMarketingOptedOut(email);
          if (optedOut) {
            continue;
          }
        }
        const token = crypto.randomUUID();
        await this.emailService.sendAbandonedCheckoutRecoveryEmail(email, token);
        sent += 1;
      } catch (error) {
        failures.push({
          email,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    return {
      dryRun: false,
      candidates: unique.length,
      sent,
      failed: failures.length,
      failures,
    };
  }
}
