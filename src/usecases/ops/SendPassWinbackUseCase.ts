import type { IPassWinbackRepository } from '../../data_layer/PassWinbackRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';
import type { EventsSink } from '../../services/events/EventsSink';

export interface SendPassWinbackResult {
  campaign: string;
  count: number;
  dryRun: boolean;
}

type IsEmailSuppressed = (email: string) => Promise<boolean>;

export class SendPassWinbackUseCase {
  constructor(
    private readonly repo: IPassWinbackRepository,
    private readonly emailService: IEmailService,
    private readonly isEmailSuppressed: IsEmailSuppressed = async () => false,
    private readonly eventsSink?: Pick<EventsSink, 'record'>
  ) {}

  async execute(
    campaign: string,
    dryRun: boolean,
    limit = 500
  ): Promise<SendPassWinbackResult> {
    const buyers = await this.repo.getExpiredPassBuyers(campaign, limit);

    if (dryRun) {
      return { campaign, count: buyers.length, dryRun: true };
    }

    let sent = 0;
    for (const buyer of buyers) {
      if (await this.isEmailSuppressed(buyer.email)) {
        continue;
      }

      const token = crypto.randomUUID();
      const claimed = await this.repo.claimNotification(
        buyer.id,
        campaign,
        token
      );
      if (!claimed) {
        continue;
      }

      try {
        await this.emailService.sendPassWinbackEmail(buyer.email, token);
        sent++;
      } catch (error) {
        console.error(
          `[pass-winback] failed to email user ${buyer.id}:`,
          error
        );
      }
    }

    this.eventsSink?.record({
      name: 'email_batch_sent',
      props: { campaign, count: sent },
    });

    return { campaign, count: sent, dryRun: false };
  }
}
