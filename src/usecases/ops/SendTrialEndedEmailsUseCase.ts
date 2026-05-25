import type { ITrialEndedEmailRepository } from '../../data_layer/TrialEndedEmailRepository';
import type { IEmailService } from '../../services/EmailService/EmailService';

export interface SendTrialEndedEmailsResult {
  count: number;
  dryRun: boolean;
}

export class SendTrialEndedEmailsUseCase {
  constructor(
    private readonly repo: ITrialEndedEmailRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(dryRun: boolean, limit = 500): Promise<SendTrialEndedEmailsResult> {
    const users = await this.repo.getUsersToNotify(limit);

    if (dryRun) {
      return { count: users.length, dryRun: true };
    }

    let sent = 0;
    for (const user of users) {
      const token = crypto.randomUUID();
      await this.repo.recordSend(user.id, token);
      try {
        const deckCount = await this.repo.countDecksInTrialWindow(
          user.id,
          user.trialStartedAt
        );
        await this.emailService.sendTrialEndedEmail(user.email, token, deckCount);
        sent++;
      } catch (error) {
        console.error(`[trial-ended] failed to email user ${user.id}:`, error);
      }
    }

    return { count: sent, dryRun: false };
  }
}
