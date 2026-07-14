import UsersRepository from '../../data_layer/UsersRepository';
import ParserRules from '../../lib/parser/ParserRules';
import { getDefaultEmailService } from '../../services/EmailService/EmailService';

export interface NotifyUserUseCaseInput {
  owner: string;
  rules: ParserRules;
  key: string;
  id: string;
  size: number;
  apkg: Buffer;
  cardCount?: number;
}

export class NotifyUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: NotifyUserUseCaseInput): Promise<void> {
    const { owner, rules, key, id, size, apkg, cardCount } = input;

    console.debug('rules.email', rules.EMAIL_NOTIFICATION);

    const shouldEmailLargeFile = size > 24;
    const shouldEmailOnRule = rules.EMAIL_NOTIFICATION;
    if (!shouldEmailLargeFile && !shouldEmailOnRule) return;

    const email = await this.usersRepository.getEmailById(owner);
    if (!email) {
      console.warn('[notify] skipping email — no address on file', { owner });
      return;
    }

    const emailService = getDefaultEmailService();
    if (shouldEmailLargeFile) {
      const link = `${process.env.DOMAIN}/api/download/u/${key}`;
      await emailService.sendConversionLinkEmail(email, id, link, cardCount);
    } else {
      await emailService.sendConversionEmail(email, id, apkg, cardCount);
    }
  }
}
