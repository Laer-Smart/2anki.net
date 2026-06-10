import type {
  IPriceLockInEmailRepository,
  PriceLockInVariant,
} from '../../data_layer/PriceLockInEmailRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import type { EventsSink } from '../../services/events/EventsSink';

export interface SendPriceLockInEmailsResult {
  count: number;
  skipped: number;
  dryRun: boolean;
  variantA: number;
  variantB: number;
}

const FOREIGN_KEY_VIOLATION = '23503';

function variantForUser(userId: number): PriceLockInVariant {
  return userId % 2 === 0 ? 'a' : 'b';
}

function isUserGoneError(error: unknown): boolean {
  return (error as { code?: string })?.code === FOREIGN_KEY_VIOLATION;
}

export class SendPriceLockInEmailsUseCase {
  constructor(
    private readonly repo: IPriceLockInEmailRepository,
    private readonly emailService: IEmailService,
    private readonly eventsSink?: Pick<EventsSink, 'record'>
  ) {}

  async execute(
    dryRun: boolean,
    limit = 500
  ): Promise<SendPriceLockInEmailsResult> {
    if (dryRun) {
      const count = await this.repo.countUsersToNotify();
      return { count, skipped: 0, dryRun: true, variantA: 0, variantB: 0 };
    }

    const users = await this.repo.getUsersToNotify(limit);

    let variantA = 0;
    let variantB = 0;
    let skipped = 0;
    let firstError: unknown;
    for (const user of users) {
      const variant = variantForUser(user.id);
      const token = crypto.randomUUID();
      try {
        await this.repo.recordSend(user.id, token, variant);
      } catch (error) {
        firstError ??= error;
        skipped++;
        console.error(`[price-lock-in] skipped user ${user.id}:`, error);
        continue;
      }
      try {
        await this.emailService.sendPriceLockInEmail(
          user.email,
          token,
          variant
        );
        if (variant === 'a') {
          variantA++;
        } else {
          variantB++;
        }
      } catch (error) {
        console.error(
          `[price-lock-in] failed to email user ${user.id}:`,
          error
        );
      }
    }

    const count = variantA + variantB;
    if (count === 0 && skipped > 0 && !isUserGoneError(firstError)) {
      throw firstError;
    }

    this.eventsSink?.record({
      name: 'email_batch_sent',
      props: {
        campaign: 'price_lock_in',
        count,
        skipped,
        variant_a: variantA,
        variant_b: variantB,
      },
    });

    return { count, skipped, dryRun: false, variantA, variantB };
  }
}
