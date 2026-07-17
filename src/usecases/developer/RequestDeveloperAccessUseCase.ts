import { IEmailService } from '../../services/EmailService/EmailService';

export type PayingStatus = 'lifetime' | 'subscriber' | 'free';

export interface DeveloperAccessRequester {
  userId: number;
  email: string;
  patreon: boolean;
  subscriber: boolean;
}

export function resolvePayingStatus(
  requester: DeveloperAccessRequester
): PayingStatus {
  if (requester.patreon) {
    return 'lifetime';
  }
  if (requester.subscriber) {
    return 'subscriber';
  }
  return 'free';
}

export class RequestDeveloperAccessUseCase {
  constructor(private readonly emailService: IEmailService) {}

  async execute(requester: DeveloperAccessRequester): Promise<boolean> {
    const status = resolvePayingStatus(requester);
    const result = await this.emailService.sendDeveloperAccessRequestEmail(
      String(requester.userId),
      requester.email,
      status
    );
    return result.didSend;
  }
}

export default RequestDeveloperAccessUseCase;
