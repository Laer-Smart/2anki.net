import type { IApiKeyUsageRepository } from '../../data_layer/ApiKeyUsageRepository';
import type { ResolvedDeveloperTier } from './ResolveDeveloperTierUseCase';

export class ApiCardLimitError extends Error {
  constructor(
    public readonly cards_used: number,
    public readonly limit: number,
    public readonly tier_key: string,
    public readonly candidate: number,
    public readonly reset_on: string
  ) {
    super(
      `API card limit reached (${cards_used}/${limit} on ${tier_key}); job would add ${candidate}`
    );
    this.name = 'ApiCardLimitError';
  }
}

interface CheckArgs {
  userId: number;
  candidateCardCount: number;
  tier: ResolvedDeveloperTier;
  now?: Date;
}

function nextMonthBoundary(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export class CheckApiCardLimitUseCase {
  constructor(private readonly usage: IApiKeyUsageRepository) {}

  async execute({
    userId,
    candidateCardCount,
    tier,
    now = new Date(),
  }: CheckArgs): Promise<void> {
    if (!Number.isFinite(tier.monthly_card_limit)) return;
    if (candidateCardCount <= 0) return;

    const { cards } = await this.usage.getMonth(userId, now);
    if (cards + candidateCardCount > tier.monthly_card_limit) {
      throw new ApiCardLimitError(
        cards,
        tier.monthly_card_limit,
        tier.tier_key,
        candidateCardCount,
        nextMonthBoundary(now).toISOString()
      );
    }
  }
}

export default CheckApiCardLimitUseCase;
