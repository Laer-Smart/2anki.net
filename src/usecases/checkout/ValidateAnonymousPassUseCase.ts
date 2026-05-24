import type { IAnonymousPassRepository, AnonymousPass } from '../../data_layer/AnonymousPassRepository';

export interface ValidateAnonymousPassResult {
  valid: boolean;
  pass?: AnonymousPass;
}

export class ValidateAnonymousPassUseCase {
  constructor(private readonly anonPassRepo: IAnonymousPassRepository) {}

  async execute(stripeSessionId: string, now: Date = new Date()): Promise<ValidateAnonymousPassResult> {
    if (stripeSessionId === '') {
      return { valid: false };
    }

    const pass = await this.anonPassRepo.findActive(stripeSessionId, now);
    if (pass == null) {
      return { valid: false };
    }

    return { valid: true, pass };
  }
}
