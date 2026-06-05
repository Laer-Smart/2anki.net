import type { IAbandonedCheckoutRecoveryRepository } from '../../data_layer/AbandonedCheckoutRecoveryRepository';

export const RESUME_FALLBACK_DESTINATION = '/pricing?from=recovery';

const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResumeCheckoutResult {
  url: string;
  resumed: boolean;
}

const FALLBACK: ResumeCheckoutResult = {
  url: RESUME_FALLBACK_DESTINATION,
  resumed: false,
};

function isStripeCheckoutUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') {
    return false;
  }
  const host = parsed.hostname;
  return host === 'stripe.com' || host.endsWith('.stripe.com');
}

export class ResumeAbandonedCheckoutUseCase {
  constructor(
    private readonly repository: Pick<
      IAbandonedCheckoutRecoveryRepository,
      'getRecoveryByToken'
    >
  ) {}

  async execute(token: unknown, now: Date = new Date()): Promise<ResumeCheckoutResult> {
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      return FALLBACK;
    }

    const recovery = await this.repository.getRecoveryByToken(token);
    if (recovery?.recoveryUrl == null) {
      return FALLBACK;
    }

    const expired =
      recovery.recoveryUrlExpiresAt != null &&
      recovery.recoveryUrlExpiresAt.getTime() <= now.getTime();
    if (expired) {
      return FALLBACK;
    }

    if (isStripeCheckoutUrl(recovery.recoveryUrl)) {
      return { url: recovery.recoveryUrl, resumed: true };
    }
    return FALLBACK;
  }
}
