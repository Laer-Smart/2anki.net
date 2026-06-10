import type {
  IPriceLockInEmailRepository,
  PriceLockInVariant,
} from '../../data_layer/PriceLockInEmailRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import type { EventsSink } from '../../services/events/EventsSink';

export interface SendPriceLockInEmailsResult {
  count: number;
  dryRun: boolean;
  variantA: number;
  variantB: number;
}

function variantForUser(userId: number): PriceLockInVariant {
  return userId % 2 === 0 ? 'a' : 'b';
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
      return { count, dryRun: true, variantA: 0, variantB: 0 };
    }

    const users = await this.repo.getUsersToNotify(limit);

    let variantA = 0;
    let variantB = 0;
    for (const user of users) {
      const variant = variantForUser(user.id);
      const token = crypto.randomUUID();
      await this.repo.recordSend(user.id, token, variant);
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
    this.eventsSink?.record({
      name: 'email_batch_sent',
      props: {
        campaign: 'price_lock_in',
        count,
        variant_a: variantA,
        variant_b: variantB,
      },
    });

    return { count, dryRun: false, variantA, variantB };
  }
}
